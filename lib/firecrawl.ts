// Firecrawl v1 scrape — returns markdown + a real full-page screenshot URL.
// We pass `formats: ['markdown', 'screenshot@fullPage']` instead of relying on
// og:image, which is small, often missing, and not representative of the app.

interface FirecrawlScrapeData {
  markdown?: string
  screenshot?: string  // Returned when 'screenshot' or 'screenshot@fullPage' is in formats
  metadata?: {
    title?: string
    description?: string
    ogImage?: string
  }
}

interface FirecrawlResponse {
  success: boolean
  data?: FirecrawlScrapeData
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
      // 'screenshot@fullPage' returns the entire scrolled page; cheaper formats
      // ('screenshot') return just the viewport. Full-page reads better as a
      // marketplace hero image.
      formats: ['markdown', 'screenshot@fullPage'],
      onlyMainContent: true,
      waitFor: 1500,  // give SPA time to hydrate before snapping
    }),
    // Firecrawl can be slow on heavy SPAs — give it room.
    signal: AbortSignal.timeout(45000),
  })

  if (!response.ok) {
    throw new Error(`Firecrawl error: ${response.status} ${response.statusText}`)
  }

  const data: FirecrawlResponse = await response.json()

  if (!data.success || !data.data) {
    throw new Error(data.error ?? 'Firecrawl returned no data')
  }

  // Prefer the real screenshot from Firecrawl; fall back to og:image only if
  // the screenshot capture failed.
  const screenshot = data.data.screenshot ?? data.data.metadata?.ogImage

  return {
    markdown:    data.data.markdown ?? '',
    title:       data.data.metadata?.title,
    description: data.data.metadata?.description,
    screenshot,
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

  // Extract og:image — this is the only "screenshot-ish" thing we can get without Firecrawl
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
