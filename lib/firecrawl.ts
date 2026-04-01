interface FirecrawlResponse {
  success: boolean
  data?: {
    markdown: string
    metadata?: {
      title?: string
      description?: string
      ogImage?: string
    }
  }
  error?: string
}

export interface ScrapeResult {
  markdown: string
  title?: string
  description?: string
  screenshot?: string
}

export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  const apiKey = process.env.FIRECRAWL_API_KEY

  // ── Free fallback: basic fetch + text extraction ─────────────
  if (!apiKey) {
    return scrapeUrlFallback(url)
  }

  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      formats: ['markdown'],
      actions: [{ type: 'screenshot' }],
    }),
  })

  if (!response.ok) {
    throw new Error(`Firecrawl error: ${response.statusText}`)
  }

  const data: FirecrawlResponse = await response.json()

  if (!data.success || !data.data) {
    throw new Error(data.error ?? 'Firecrawl returned no data')
  }

  return {
    markdown:    data.data.markdown,
    title:       data.data.metadata?.title,
    description: data.data.metadata?.description,
    screenshot:  data.data.metadata?.ogImage,
  }
}

// ── FREE fallback: native fetch (no Firecrawl needed) ───────────
async function scrapeUrlFallback(url: string): Promise<ScrapeResult> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'GetForged-Scraper/1.0' },
    signal: AbortSignal.timeout(10000),
  })

  if (!response.ok) throw new Error(`Fetch failed: ${response.status}`)

  const html = await response.text()

  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const title = titleMatch?.[1]?.trim()

  // Extract meta description
  const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)
  const description = descMatch?.[1]?.trim()

  // Extract og:image
  const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
  const screenshot = ogImageMatch?.[1]?.trim()

  // Strip HTML tags and clean up text
  const markdown = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 12000)

  return { markdown, title, description, screenshot }
}
