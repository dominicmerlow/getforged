/**
 * Source-of-truth registry for every editable content key on the site.
 *
 * - `default` — what renders when the DB has no override for this key.
 * - `description` — admin-facing label shown in /admin/content.
 * - `group` — section in the admin UI for organising keys.
 * - `kind` — schema hint for the editor: text / multiline / array / boolean / number.
 *
 * Adding a new editable key is a 3-step change:
 *   1. Add an entry here
 *   2. Read it from the component via getContent('your.key')
 *   3. (Optional) update the seed migration if you want the row to exist
 *      in the DB on first deploy
 *
 * No DB migration is required to add new keys — defaults live in code, the
 * DB only stores overrides.
 */

export type ContentKind = 'text' | 'multiline' | 'rich' | 'array' | 'boolean' | 'number'

export interface ContentDef<T = unknown> {
  default: T
  description: string
  group: string
  kind: ContentKind
}

// The whole registry — keys are dot-namespaced for grouping in the admin UI.
// Order roughly matches reading order through the homepage.
export const CONTENT_REGISTRY = {
  // ── Announcement banner (top of every page when enabled) ─────────
  'announcement.enabled': {
    default: false,
    description: 'Show the site-wide announcement banner',
    group: 'Announcement Banner',
    kind: 'boolean' as const,
  } satisfies ContentDef<boolean>,
  'announcement.text': {
    default: 'Limited launch — first 50 builders get a Founding Builder badge.',
    description: 'Banner text',
    group: 'Announcement Banner',
    kind: 'text' as const,
  } satisfies ContentDef<string>,
  'announcement.cta_label': {
    default: 'Apply →',
    description: 'Banner CTA label',
    group: 'Announcement Banner',
    kind: 'text' as const,
  } satisfies ContentDef<string>,
  'announcement.cta_url': {
    default: '/submit',
    description: 'Banner CTA link target',
    group: 'Announcement Banner',
    kind: 'text' as const,
  } satisfies ContentDef<string>,

  // ── Homepage hero ────────────────────────────────────────────────
  'homepage.hero.eyebrow': {
    default: 'The AI Builder Marketplace',
    description: 'Eyebrow above hero H1',
    group: 'Homepage Hero',
    kind: 'text' as const,
  } satisfies ContentDef<string>,
  'homepage.hero.h1': {
    default: 'Buy the AI tool you would have <em>hired</em> a developer to build.',
    description: 'Hero headline (HTML allowed; use <em> for amber italic)',
    group: 'Homepage Hero',
    kind: 'rich' as const,
  } satisfies ContentDef<string>,
  'homepage.hero.sub': {
    default:
      "<strong>Pre-built apps, automations and internal tools</strong> — installed in hours, priced like software, owned like assets. From £49.",
    description: 'Hero sub-headline (HTML allowed)',
    group: 'Homepage Hero',
    kind: 'rich' as const,
  } satisfies ContentDef<string>,
  'homepage.hero.cta_primary_label': {
    default: 'Browse the Marketplace →',
    description: 'Primary CTA button text',
    group: 'Homepage Hero',
    kind: 'text' as const,
  } satisfies ContentDef<string>,
  'homepage.hero.cta_secondary_label': {
    default: 'Find My Tool with AI',
    description: 'Secondary CTA button text',
    group: 'Homepage Hero',
    kind: 'text' as const,
  } satisfies ContentDef<string>,

  // ── Homepage CTA section (above footer) ──────────────────────────
  'homepage.cta.eyebrow': {
    default: 'Get Started',
    description: 'Eyebrow above the closing-CTA section',
    group: 'Homepage CTA Section',
    kind: 'text' as const,
  } satisfies ContentDef<string>,
  'homepage.cta.heading': {
    default: 'The Window<br/>Is <span>Open.</span>',
    description: 'Closing-CTA heading (HTML; <span> = amber)',
    group: 'Homepage CTA Section',
    kind: 'rich' as const,
  } satisfies ContentDef<string>,
  'homepage.cta.body': {
    default:
      "AI builders are creating a new asset class. Small businesses need exactly what you've made. GetForged is where they meet.",
    description: 'Closing-CTA body copy',
    group: 'Homepage CTA Section',
    kind: 'multiline' as const,
  } satisfies ContentDef<string>,

  // ── Newsletter card ──────────────────────────────────────────────
  'newsletter.heading': {
    default: 'Forge of the Week',
    description: 'Newsletter card heading',
    group: 'Newsletter',
    kind: 'text' as const,
  } satisfies ContentDef<string>,
  'newsletter.subhead': {
    default:
      'One curated AI-built tool, in your inbox every Tuesday. Built by real makers. No noise, no hype.',
    description: 'Newsletter card sub-headline',
    group: 'Newsletter',
    kind: 'multiline' as const,
  } satisfies ContentDef<string>,
  'newsletter.cta_label': {
    default: 'Get the first issue',
    description: 'Newsletter subscribe button text',
    group: 'Newsletter',
    kind: 'text' as const,
  } satisfies ContentDef<string>,

  // ── Pricing section ──────────────────────────────────────────────
  'pricing.section_tag': {
    default: 'Seller Plans',
    description: 'Pricing section tag (small caps)',
    group: 'Pricing',
    kind: 'text' as const,
  } satisfies ContentDef<string>,
  'pricing.heading': {
    default: 'Free to List.<br/>We Earn <span>Only When You Do.</span>',
    description: 'Pricing main heading (HTML)',
    group: 'Pricing',
    kind: 'rich' as const,
  } satisfies ContentDef<string>,
  'pricing.tier_label': {
    default: 'Founding Builder · Launch Offer',
    description: 'Tier badge above the price',
    group: 'Pricing',
    kind: 'text' as const,
  } satisfies ContentDef<string>,
  'pricing.commission_note': {
    default:
      '15% commission only when you make a sale · No subscription · No card on file',
    description: 'Footnote under bullets',
    group: 'Pricing',
    kind: 'text' as const,
  } satisfies ContentDef<string>,
  'pricing.cta_label': {
    default: 'Become a Founding Builder →',
    description: 'CTA button text',
    group: 'Pricing',
    kind: 'text' as const,
  } satisfies ContentDef<string>,

  // ── Footer ───────────────────────────────────────────────────────
  'footer.tagline': {
    default: 'The marketplace for AI-built apps and automations.',
    description: 'Footer tagline (under logo)',
    group: 'Footer',
    kind: 'text' as const,
  } satisfies ContentDef<string>,
  'footer.copy': {
    default: '© 2026 GetForged. Made by builders, for buyers.',
    description: 'Bottom copyright line',
    group: 'Footer',
    kind: 'text' as const,
  } satisfies ContentDef<string>,
} as const

export type ContentKey = keyof typeof CONTENT_REGISTRY

export const ALL_CONTENT_KEYS = Object.keys(CONTENT_REGISTRY) as ContentKey[]

/** Helper for the admin UI: groups all keys by their `group` field, in registry order. */
export function groupedContentKeys(): Array<{ group: string; keys: ContentKey[] }> {
  const groups = new Map<string, ContentKey[]>()
  for (const key of ALL_CONTENT_KEYS) {
    const group = CONTENT_REGISTRY[key].group
    if (!groups.has(group)) groups.set(group, [])
    groups.get(group)!.push(key)
  }
  return Array.from(groups, ([group, keys]) => ({ group, keys }))
}
