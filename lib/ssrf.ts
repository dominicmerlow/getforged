/**
 * Guard for URLs that arrive from users and get fetched by the server.
 *
 * `/submit` takes a URL from anyone with an account and the scraper fetches
 * it, so without this the serverless function is an open proxy into anything
 * its network can reach — `http://localhost:3000/api/...`, the cloud metadata
 * endpoint at 169.254.169.254, a private VPC address. And the result is not
 * blind: the scraped title and description are written to the product row and
 * rendered on the attacker's own public listing.
 *
 * Two halves, both necessary:
 *   - `assertPublicUrl` resolves the hostname and refuses anything that
 *     answers on a loopback, private, link-local, or otherwise non-public
 *     address. A name check alone is not enough — `db.internal.example.com`
 *     can resolve to 10.0.0.5, and so can a name an attacker controls.
 *   - `safeFetch` disables automatic redirect following and re-checks every
 *     hop, because a public URL is free to 302 into link-local space and
 *     `fetch` would follow it without asking.
 */
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

export class BlockedUrlError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BlockedUrlError'
  }
}

/** Hostnames that never legitimately host a public product page. */
const BLOCKED_HOST_SUFFIXES = ['.localhost', '.internal', '.local', '.home.arpa']

function ipv4IsPublic(ip: string): boolean {
  const [a, b] = ip.split('.').map(Number)
  if (a === 0) return false                          // "this network"
  if (a === 10) return false                         // private
  if (a === 127) return false                        // loopback
  if (a === 169 && b === 254) return false           // link-local, incl. cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return false  // private
  if (a === 192 && b === 168) return false           // private
  if (a === 100 && b >= 64 && b <= 127) return false // CGNAT
  if (a === 192 && b === 0) return false             // IETF protocol assignments
  if (a >= 224) return false                         // multicast, reserved, broadcast
  return true
}

/**
 * Expand an IPv6 literal to its 16 bytes, or null if it will not parse.
 *
 * Written out rather than pattern-matched on the string because the WHATWG
 * URL parser normalises as it goes: `http://[::ffff:127.0.0.1]/` comes back
 * with a hostname of `::ffff:7f00:1`, so a check looking for a dotted quad at
 * the end sees a plain hex address and waves the loopback through. That was a
 * real hole in the first version of this file, caught by
 * scripts/verify-ssrf-guard.ts.
 */
function ipv6ToBytes(addr: string): number[] | null {
  let text = addr.toLowerCase().split('%')[0]

  // A trailing dotted quad (::ffff:127.0.0.1) becomes two hextets.
  const dotted = text.match(/^(.*:)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/)
  if (dotted) {
    const quad = dotted[2].split('.').map(Number)
    if (quad.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return null
    const hi = ((quad[0] << 8) | quad[1]).toString(16)
    const lo = ((quad[2] << 8) | quad[3]).toString(16)
    text = `${dotted[1]}${hi}:${lo}`
  }

  const halves = text.split('::')
  if (halves.length > 2) return null
  const parse = (part: string) =>
    part === '' ? [] : part.split(':').map(h => (/^[0-9a-f]{1,4}$/.test(h) ? parseInt(h, 16) : NaN))

  const head = parse(halves[0])
  const tail = halves.length === 2 ? parse(halves[1]) : []
  if ([...head, ...tail].some(Number.isNaN)) return null

  let groups: number[]
  if (halves.length === 2) {
    const gap = 8 - head.length - tail.length
    if (gap < 1) return null
    groups = [...head, ...Array(gap).fill(0), ...tail]
  } else {
    groups = head
  }
  if (groups.length !== 8) return null

  return groups.flatMap(g => [(g >> 8) & 0xff, g & 0xff])
}

function ipv6IsPublic(ip: string): boolean {
  const bytes = ipv6ToBytes(ip)
  if (!bytes) return false

  const allZero = (upTo: number) => bytes.slice(0, upTo).every(b => b === 0)

  if (allZero(16)) return false                                   // unspecified ::
  if (allZero(15) && bytes[15] === 1) return false                // loopback ::1
  if (bytes[0] === 0xff) return false                             // multicast ff00::/8
  if (bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0x80) return false // link-local fe80::/10
  if ((bytes[0] & 0xfe) === 0xfc) return false                    // unique-local fc00::/7

  // IPv4-mapped (::ffff:a.b.c.d) and IPv4-compatible (::a.b.c.d) carry a real
  // IPv4 address in the last four bytes; judge them by IPv4 rules.
  const embedded = () => bytes.slice(12).join('.')
  if (allZero(10) && bytes[10] === 0xff && bytes[11] === 0xff) return ipv4IsPublic(embedded())
  if (allZero(12)) return ipv4IsPublic(embedded())

  return true
}

function addressIsPublic(ip: string): boolean {
  const family = isIP(ip)
  if (family === 4) return ipv4IsPublic(ip)
  if (family === 6) return ipv6IsPublic(ip)
  return false
}

/**
 * Throws {@link BlockedUrlError} unless `raw` is an http(s) URL whose host
 * resolves exclusively to public addresses.
 *
 * Every resolved address must pass, not just the first: a hostname with both
 * a public and a private A record would otherwise get through and the private
 * one could win the next lookup.
 */
export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new BlockedUrlError('That is not a valid URL.')
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new BlockedUrlError('Only http and https URLs can be fetched.')
  }

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (host === 'localhost' || BLOCKED_HOST_SUFFIXES.some(s => host.endsWith(s))) {
    throw new BlockedUrlError('That host is not publicly reachable.')
  }

  // A literal IP needs no lookup — and must not get one, since `lookup` on an
  // IP just echoes it back and would make the check look like it did work.
  if (isIP(host)) {
    if (!addressIsPublic(host)) {
      throw new BlockedUrlError('That address is not publicly routable.')
    }
    return url
  }

  let records: { address: string }[]
  try {
    records = await lookup(host, { all: true })
  } catch {
    throw new BlockedUrlError('That hostname could not be resolved.')
  }

  if (records.length === 0) {
    throw new BlockedUrlError('That hostname could not be resolved.')
  }
  for (const record of records) {
    if (!addressIsPublic(record.address)) {
      throw new BlockedUrlError('That host resolves to a private address.')
    }
  }
  return url
}

/**
 * `fetch` for user-supplied URLs: validates the target, then follows
 * redirects manually so each hop is validated too.
 */
export async function safeFetch(
  raw: string,
  init: RequestInit = {},
  maxRedirects = 4
): Promise<Response> {
  let target = (await assertPublicUrl(raw)).toString()

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const response = await fetch(target, { ...init, redirect: 'manual' })
    const location = response.headers.get('location')
    if (response.status < 300 || response.status >= 400 || !location) {
      return response
    }
    // Relative redirects are normal; resolve against the current target
    // before validating, or a `/admin` hop would fail to parse and be
    // mistaken for a safe response.
    const next = new URL(location, target).toString()
    target = (await assertPublicUrl(next)).toString()
  }

  throw new BlockedUrlError('That URL redirected too many times.')
}
