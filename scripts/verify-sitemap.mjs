#!/usr/bin/env node
/**
 * Post-deploy check: does the live sitemap describe the real catalogue?
 *
 * On 2026-08-19 the sitemap listed all six hard-coded seed slugs and neither
 * real product, because `listLiveProductSlugs()` fell back to seed data and the
 * route was prerendered once at deploy time. It was well-formed, returned 200,
 * and was entirely fiction — exactly the class of bug that caused the outage.
 *
 * Five assertions, each of which can actually fail:
 *
 *   1. No seed slug appears. The slug list is grepped out of
 *      `lib/seed-products.ts`, never hand-typed, so adding a seed product
 *      cannot silently widen the hole.
 *   2. Every product URL in the sitemap returns 200 — catches phantom entries
 *      in general, not just the six we already know about.
 *   3. Every product linked from /browse appears in the sitemap — catches the
 *      opposite failure, a real listing crawlers never hear about.
 *   4. Seed slugs 404 rather than rendering a phantom product page.
 *   5. Sign-in / tokened / transactional routes stay out.
 *
 * Usage:  node scripts/verify-sitemap.mjs [base-url]
 * Exit 0 = pass, 1 = fail.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const BASE = (process.argv[2] ?? 'https://getforged.getbrian.xyz').replace(/\/$/, '')
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const failures = []
const notes = []
const fail = (msg) => failures.push(msg)

function seedSlugs() {
  const src = readFileSync(join(ROOT, 'lib', 'seed-products.ts'), 'utf8')
  const slugs = [...src.matchAll(/^\s*slug:\s*'([^']+)'/gm)].map((m) => m[1])
  if (slugs.length === 0) {
    throw new Error('could not grep any slugs out of lib/seed-products.ts — the check itself is broken')
  }
  return slugs
}

async function text(url) {
  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`)
  return res.text()
}

const productSlug = (url) => url.match(/\/products\/([^/?#]+)/)?.[1] ?? null

const seeds = seedSlugs()
notes.push(`seed slugs from lib/seed-products.ts: ${seeds.join(', ')}`)

const xml = await text(`${BASE}/sitemap.xml`)
const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
if (locs.length === 0) fail('sitemap.xml contains no <loc> entries at all')

const sitemapProducts = locs.map(productSlug).filter(Boolean)
notes.push(`sitemap: ${locs.length} URLs, ${sitemapProducts.length} products (${sitemapProducts.join(', ') || 'none'})`)

// 1. No seed data reaches a crawler.
for (const slug of seeds) {
  if (sitemapProducts.includes(slug)) fail(`sitemap advertises seed product "${slug}" — no such listing exists`)
}

// 2. Every advertised product actually resolves.
for (const slug of sitemapProducts) {
  const res = await fetch(`${BASE}/products/${slug}`, { redirect: 'follow' })
  if (!res.ok) fail(`sitemap advertises /products/${slug}, which returns HTTP ${res.status}`)
}

// 3. Nothing real is missing. /browse is the human-facing catalogue; anything
//    a shopper can reach from it, a crawler must be able to reach too.
const browse = await text(`${BASE}/browse`)
const browseProducts = [...new Set(
  [...browse.matchAll(/href="\/products\/([^"?#]+)"/g)].map((m) => m[1])
)]
notes.push(`/browse links to ${browseProducts.length} products (${browseProducts.join(', ') || 'none'})`)
if (browseProducts.length === 0) fail('/browse links to no products — cannot cross-check the sitemap')
for (const slug of browseProducts) {
  if (!sitemapProducts.includes(slug)) fail(`/browse sells "${slug}" but the sitemap never mentions it`)
}

// 4. Seed slugs must not render a product page either. They were never in the
//    sitemap by accident — `getProductBySlug()` fell back to seed data too, so
//    /products/invoicebot-pro served a complete, plausible, unbuyable listing.
for (const slug of seeds) {
  const res = await fetch(`${BASE}/products/${slug}`, { redirect: 'follow' })
  if (res.ok) fail(`/products/${slug} returns HTTP 200 — a seed product page is still reachable`)
}

// 5. Routes that must never be indexed.
for (const path of ['/login', '/claim', '/whoami', '/checkout', '/dashboard']) {
  if (locs.some((u) => u.replace(BASE, '').startsWith(path))) fail(`sitemap lists ${path}, which must not be indexed`)
}

for (const n of notes) console.log(`  · ${n}`)
console.log('')
if (failures.length > 0) {
  console.error(`FAIL — ${failures.length} problem(s) with ${BASE}/sitemap.xml`)
  for (const f of failures) console.error(`  ✗ ${f}`)
  process.exit(1)
}
console.log(`PASS — ${BASE}/sitemap.xml matches the real catalogue`)
