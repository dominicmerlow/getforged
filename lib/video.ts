// Extract a YouTube video ID from the common URL shapes:
//   https://youtu.be/ID
//   https://www.youtube.com/watch?v=ID
//   https://www.youtube.com/embed/ID
//   https://www.youtube.com/shorts/ID
// Returns null for non-YouTube URLs.
export function parseYouTubeId(raw: string | null | undefined): string | null {
  if (!raw) return null
  try {
    const url = new URL(raw)
    const host = url.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') {
      return url.pathname.slice(1).split('/')[0] || null
    }
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (url.pathname === '/watch') return url.searchParams.get('v')
      const parts = url.pathname.split('/').filter(Boolean)
      if (parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'v') {
        return parts[1] ?? null
      }
    }
  } catch {
    // not a valid URL
  }
  return null
}

export function parseVimeoId(raw: string | null | undefined): string | null {
  if (!raw) return null
  try {
    const url = new URL(raw)
    const host = url.hostname.replace(/^www\./, '')
    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      const match = url.pathname.match(/(\d{6,})/)
      return match?.[1] ?? null
    }
  } catch {
    /* noop */
  }
  return null
}
