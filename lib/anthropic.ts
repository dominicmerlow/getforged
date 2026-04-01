import Anthropic from '@anthropic-ai/sdk'
import type { GeneratedSalesPage } from './types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are a senior SaaS copywriter for GetForged — an AI app marketplace connecting builders to small businesses.
Your job: write a compelling, buyer-focused sales page for a product listed on GetForged.
Return VALID JSON only. No markdown, no code blocks, no commentary. Just the raw JSON object.`

const USER_PROMPT = (scrapedContent: string, productName: string, category: string) => `
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

export async function generateSalesPage(
  scrapedContent: string,
  productName: string,
  category: string
): Promise<GeneratedSalesPage> {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: USER_PROMPT(scrapedContent, productName, category),
      },
    ],
    system: SYSTEM_PROMPT,
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  // Strip any accidental markdown code fences
  const cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim()

  return JSON.parse(cleaned) as GeneratedSalesPage
}
