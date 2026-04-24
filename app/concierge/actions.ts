'use server'

import { listLiveProducts } from '@/lib/products'
import { generateSmall } from '@/lib/llm'

export type ConciergeState = {
  results: { slug: string; title: string; reason: string }[]
  query: string
} | { error: string } | null

export async function conciergeSearch(
  _prev: ConciergeState,
  formData: FormData
): Promise<ConciergeState> {
  const query = String(formData.get('query') ?? '').trim()
  if (!query || query.length < 5) {
    return { error: 'Please describe what you need (at least 5 characters).' }
  }
  if (query.length > 400) {
    return { error: 'Keep your description under 400 characters.' }
  }

  const products = await listLiveProducts()
  if (products.length === 0) return { error: 'No products available yet.' }

  const catalog = products
    .map(
      p =>
        `slug: ${p.slug}\ntitle: ${p.title}\ncategory: ${p.category}\ndescription: ${p.description}\ntags: ${p.tags.join(', ')}`
    )
    .join('\n\n---\n\n')

  const prompt = `You are a product matcher for GetForged, an AI app marketplace. A buyer described their need. Pick the 3 best matching products from the catalog and explain why each fits.

BUYER NEED: ${query}

CATALOG:
${catalog}

Respond ONLY with valid JSON — no markdown, no code blocks, just raw JSON:
{"results": [{"slug": "...", "title": "...", "reason": "One sentence why this fits."}, ...]}

If fewer than 3 products match well, return fewer. If nothing matches, return {"results": []}.`

  try {
    const raw = await generateSmall(prompt)
    // Strip any markdown code blocks if the LLM wrapped it
    const cleaned = raw
      .replace(/^```[a-z]*\n?/i, '')
      .replace(/\n?```$/i, '')
      .trim()
    const parsed = JSON.parse(cleaned)
    const results = (parsed.results ?? [])
      .slice(0, 3)
      .filter(
        (r: { slug?: string; title?: string; reason?: string }) => r.slug && r.title
      )
    return { results, query }
  } catch {
    return { error: 'Could not process your request. Try again in a moment.' }
  }
}
