// ─── Multi-provider LLM layer ────────────────────────────────────
// Primary:  OpenRouter with FREE models only — tried in order,
//           first success wins, subsequent ones are fallbacks.
// Fallback: Anthropic direct (paid reliability path)
// Final:    throw, caller handles stub fallback
//
// Configure with env vars:
//   OPENROUTER_API_KEY   — enables OpenRouter
//   OPENROUTER_MODELS    — comma-separated override of free-model list
//   ANTHROPIC_API_KEY    — enables direct Anthropic as last resort
//   ANTHROPIC_MODEL      — override default Claude model

import Anthropic from '@anthropic-ai/sdk'
import type { GeneratedSalesPage } from './types'

// Ranked list of the strongest free models on OpenRouter for
// structured JSON output. DeepSeek V3.1 currently leads for
// instruction following + JSON reliability; Gemini 2.5 Flash
// and Llama 3.3 70B are solid fallbacks.
const DEFAULT_FREE_MODELS = [
  'deepseek/deepseek-chat-v3.1:free',
  'google/gemini-2.5-flash-exp:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'qwen/qwen-2.5-72b-instruct:free',
  'nvidia/llama-3.1-nemotron-70b-instruct:free',
]

const DEFAULT_ANTHROPIC_MODEL = 'claude-haiku-4-5'

function freeModels(): string[] {
  const override = process.env.OPENROUTER_MODELS
  if (override) {
    return override.split(',').map(s => s.trim()).filter(Boolean)
  }
  return DEFAULT_FREE_MODELS
}

const SYSTEM_PROMPT = `You are a senior SaaS copywriter for GetForged — an AI app marketplace connecting builders to small businesses.
Your job: write a compelling, buyer-focused sales page for a product listed on GetForged.
Return VALID JSON only. No markdown, no code blocks, no commentary. Just the raw JSON object.`

const userPrompt = (scrapedContent: string, productName: string, category: string) => `
Product name: ${productName}
Category: ${category}

Scraped content from the product website:
---
${scrapedContent.slice(0, 8000)}
---

Generate a sales page JSON with exactly these fields:
{
  "headline": "Short, punchy benefit headline (max 10 words)",
  "subheadline": "One sentence expanding the headline (max 20 words)",
  "problem_statement": "2-3 sentences describing the pain this product solves for SMEs",
  "features": [
    { "title": "Feature name", "description": "One line benefit description" }
  ],
  "use_cases": [
    { "title": "Use case", "description": "One line description" }
  ],
  "cta_primary": "Primary button text (max 5 words)",
  "cta_secondary": "Secondary button text (max 5 words)",
  "meta_title": "SEO title (max 60 chars)",
  "meta_description": "SEO description (max 155 chars)"
}

Rules:
- Write for UK SME owners, not developers
- Emphasise time saved, cost saved, problems solved
- features: 4-6 items
- use_cases: 3-4 items
- Tone: confident, direct, no fluff`

function parseJsonSafely(text: string): GeneratedSalesPage {
  const cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
  // Some models wrap output in an object like {"response": {...}} — try to
  // unwrap if the shape doesn't match what we expect.
  const parsed = JSON.parse(cleaned) as unknown
  if (parsed && typeof parsed === 'object' && 'headline' in parsed) {
    return parsed as GeneratedSalesPage
  }
  if (parsed && typeof parsed === 'object') {
    // Try common wrapper keys
    for (const key of ['response', 'result', 'data', 'output']) {
      const inner = (parsed as Record<string, unknown>)[key]
      if (inner && typeof inner === 'object' && 'headline' in inner) {
        return inner as GeneratedSalesPage
      }
    }
  }
  throw new Error('LLM response did not contain expected fields')
}

// ─── OpenRouter (single model attempt) ───────────────────────────
async function tryOpenRouterModel(
  scrapedContent: string,
  productName: string,
  category: string,
  model: string
): Promise<GeneratedSalesPage> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://getforged.vercel.app'

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      // OpenRouter uses these for attribution + optional ranking
      'HTTP-Referer': appUrl,
      'X-Title': 'GetForged',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt(scrapedContent, productName, category) },
      ],
      // JSON mode is a hint on non-OpenAI models; we still parse defensively.
      response_format: { type: 'json_object' },
      max_tokens: 2048,
      temperature: 0.4,
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`OpenRouter ${response.status}: ${body.slice(0, 200)}`)
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[]
    error?: { message?: string }
  }

  if (data.error) {
    throw new Error(`OpenRouter error: ${data.error.message ?? 'unknown'}`)
  }

  const text = data.choices?.[0]?.message?.content ?? ''
  if (!text.trim()) throw new Error('OpenRouter returned empty content')

  return parseJsonSafely(text)
}

// ─── Anthropic direct (fallback) ─────────────────────────────────
async function tryAnthropic(
  scrapedContent: string,
  productName: string,
  category: string
): Promise<GeneratedSalesPage> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || !apiKey.startsWith('sk-ant-')) {
    throw new Error('ANTHROPIC_API_KEY not set')
  }

  const client = new Anthropic({ apiKey })
  const model = process.env.ANTHROPIC_MODEL ?? DEFAULT_ANTHROPIC_MODEL

  const message = await client.messages.create({
    model,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: userPrompt(scrapedContent, productName, category) },
    ],
  })

  const block = message.content[0]
  const text = block && block.type === 'text' ? block.text : ''
  if (!text.trim()) throw new Error('Anthropic returned empty content')

  return parseJsonSafely(text)
}

// ─── Public entry point: try both, report what worked ────────────
export interface GenerationOutcome {
  page: GeneratedSalesPage
  provider: 'openrouter' | 'anthropic'
  model: string
}

export async function generateSalesPageSmart(
  scrapedContent: string,
  productName: string,
  category: string
): Promise<GenerationOutcome> {
  const errors: string[] = []

  // ── Tier 1: OpenRouter free models (cycle through list) ──────
  if (process.env.OPENROUTER_API_KEY) {
    for (const model of freeModels()) {
      try {
        const page = await tryOpenRouterModel(
          scrapedContent,
          productName,
          category,
          model
        )
        return { page, provider: 'openrouter', model }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`openrouter[${model}]: ${msg}`)
        console.warn(`[llm] OpenRouter ${model} failed, trying next:`, msg)
      }
    }
  }

  // ── Tier 2: Anthropic direct (paid fallback) ─────────────────
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const page = await tryAnthropic(scrapedContent, productName, category)
      return {
        page,
        provider: 'anthropic',
        model: process.env.ANTHROPIC_MODEL ?? DEFAULT_ANTHROPIC_MODEL,
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`anthropic: ${msg}`)
    }
  }

  throw new Error(
    errors.length > 0
      ? `All LLM providers failed — ${errors.join(' | ')}`
      : 'No LLM provider configured (set OPENROUTER_API_KEY or ANTHROPIC_API_KEY)'
  )
}

export function llmConfigured(): boolean {
  return !!(process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY)
}

// ─── Simple text generation (raw string output) ───────────────────
// Used by the AI Concierge and other features that need a raw text
// response from a prompt, without structured JSON parsing.
export async function generateSmall(prompt: string): Promise<string> {
  const errors: string[] = []

  // Tier 1: OpenRouter with a lightweight free model
  if (process.env.OPENROUTER_API_KEY) {
    const smallModels = [
      'deepseek/deepseek-chat-v3.1:free',
      'google/gemini-2.5-flash-exp:free',
      'meta-llama/llama-3.3-70b-instruct:free',
    ]
    const apiKey = process.env.OPENROUTER_API_KEY
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://getforged.vercel.app'

    for (const model of smallModels) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': appUrl,
            'X-Title': 'GetForged',
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1024,
            temperature: 0.3,
          }),
        })

        if (!response.ok) {
          const body = await response.text().catch(() => '')
          throw new Error(`OpenRouter ${response.status}: ${body.slice(0, 200)}`)
        }

        const data = (await response.json()) as {
          choices?: { message?: { content?: string } }[]
          error?: { message?: string }
        }

        if (data.error) throw new Error(`OpenRouter error: ${data.error.message ?? 'unknown'}`)

        const text = data.choices?.[0]?.message?.content ?? ''
        if (!text.trim()) throw new Error('OpenRouter returned empty content')

        return text
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`openrouter[${model}]: ${msg}`)
        console.warn(`[llm] generateSmall OpenRouter ${model} failed:`, msg)
      }
    }
  }

  // Tier 2: Anthropic direct
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const apiKey = process.env.ANTHROPIC_API_KEY
      if (!apiKey.startsWith('sk-ant-')) throw new Error('ANTHROPIC_API_KEY not set')

      const client = new Anthropic({ apiKey })
      const model = process.env.ANTHROPIC_MODEL ?? DEFAULT_ANTHROPIC_MODEL

      const message = await client.messages.create({
        model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      })

      const block = message.content[0]
      const text = block && block.type === 'text' ? block.text : ''
      if (!text.trim()) throw new Error('Anthropic returned empty content')
      return text
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`anthropic: ${msg}`)
    }
  }

  throw new Error(
    errors.length > 0
      ? `generateSmall: all providers failed — ${errors.join(' | ')}`
      : 'generateSmall: no LLM provider configured (set OPENROUTER_API_KEY or ANTHROPIC_API_KEY)'
  )
}
