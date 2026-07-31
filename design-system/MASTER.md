# GetForged Design System — MASTER

**Pattern:** Marketplace / Directory (search bar *is* the CTA)
**Reference structure:** Fiverr
**Accent:** GetForged amber — retained, not replaced with Fiverr green
**Generated:** 2026-07-30 via `ui-ux-pro-max --design-system` + marketplace/landing/ux/nextjs domain searches

---

## 1. Principles

1. **Search is the hero.** The primary conversion action on the homepage is a search field, not a button. Popular-search chips sit directly beneath it to remove the blank-field problem.
2. **White surfaces, hairline borders.** Depth comes from `#e4e5e7` 1px borders and a single soft shadow on hover — never from heavy shadows or gradients.
3. **The card is the product.** Listings render as a uniform gig card. Every card shows the same six things in the same order so scanning is effortless.
4. **Amber earns its place.** Amber is a *background* colour (buttons, price emphasis, active states). It is never body text — its contrast on white is 2.4:1.
5. **No decoration that isn't information.** No grain overlay, no custom cursor, no floating/rotated cards, no display serif. Fiverr's credibility comes from restraint.

---

## 2. Colour

### Surfaces
| Token | Hex | Use |
|---|---|---|
| `--gf-surface` | `#ffffff` | Page background, cards |
| `--gf-surface-2` | `#f7f7f7` | Section bands, back-office page bg, input fills |
| `--gf-surface-3` | `#efeff0` | Hover fills, skeletons |
| `--gf-ink-surface` | `#1c1f26` | Dark inverted bands (seller CTA, pro band) |

### Text
| Token | Hex | Contrast on white | Use |
|---|---|---|---|
| `--gf-text` | `#222325` | 15.6:1 | Headings, card titles, prices |
| `--gf-text-2` | `#62646a` | 5.9:1 | Body copy, descriptions, table cells |
| `--gf-text-3` | `#95979d` | 3.2:1 | **Large/decorative only** — meta labels ≥18px, disabled |

### Lines
| Token | Hex | Use |
|---|---|---|
| `--gf-line` | `#e4e5e7` | All borders, dividers, input outlines |
| `--gf-line-strong` | `#c5c6c9` | Hover borders, focused inputs |

### Accent & semantic
| Token | Hex | Use |
|---|---|---|
| `--gf-amber` | `#e8920a` | Primary button fill, active chip fill, price emphasis |
| `--gf-amber-hover` | `#cf8009` | Primary button hover |
| `--gf-amber-tint` | `#fef6e7` | Selected-row fill, badge background |
| `--gf-amber-ink` | `#8f5a06` | **Amber-as-text** (5.2:1 on white) — links, inline emphasis |
| `--gf-star` | `#ffb33e` | Rating stars only |
| `--gf-success` | `#1f8b5f` | Verified badges, "live" status (4.6:1) |
| `--gf-danger` | `#c2374a` | Destructive actions, errors, "archived" status |
| `--gf-info` | `#2f6fdb` | Informational badges, "draft" status |

**On-amber text is always `--gf-text` (`#222325` on `#e8920a` = 6.4:1), never white.**

---

## 3. Typography

Two-font system. Both loaded via `next/font/google` with `display: swap`.

| Role | Font | Weights | CSS var |
|---|---|---|---|
| Headings, UI chrome, buttons, prices | **Plus Jakarta Sans** | 400 500 600 700 800 | `--font-sans` |
| Body copy, dense tables, form values | **Inter** | 400 500 600 700 | `--font-body` |

### Legacy variable rebinding
The pre-redesign codebase carries ~470 inline `var(--font-mono)` / `var(--font-serif)` / `var(--font-bebas)` references across 80+ files. Rather than hand-edit each, all four legacy font vars are **rebound** to the two new families so every untouched page de-serifs and de-monospaces automatically:

```
--font-serif → Inter          (was Fraunces)
--font-mono  → Inter          (was DM Mono)
--font-bebas → Plus Jakarta   (was Bebas Neue)
--font-sans  → Plus Jakarta   (was Montserrat)
```

The same lever applies to colour: `--warm-ink`, `--cream`, `--soft-amber`, `--ink`, `--amber` etc. are rebound to the palette above, so ~440 inline colour references migrate without edits.

### Scale
| Step | Size / line-height | Weight | Use |
|---|---|---|---|
| Display | `clamp(34px, 4.6vw, 52px)` / 1.12 | 700 | Hero h1 |
| H2 | `clamp(24px, 3vw, 32px)` / 1.2 | 700 | Section titles |
| H3 | 20px / 1.3 | 600 | Sub-sections, card group titles |
| Body-L | 18px / 1.6 | 400 | Hero sub, section intros |
| Body | 16px / 1.6 | 400 | Default body — **never below 16px on mobile** |
| Body-S | 14px / 1.5 | 400 | Card descriptions, table cells |
| Meta | 13px / 1.4 | 500 | Labels, badges, breadcrumbs |
| Micro | 12px / 1.4 | 600 | Level badges, tag pills |

No uppercase + wide letter-spacing labels. Fiverr uses sentence case at normal tracking; the old `letter-spacing: 0.22em` mono eyebrows are removed.

---

## 4. Spacing, radius, elevation

- **Spacing scale:** 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80 px.
- **Container:** `max-width: 1400px`, side padding 24px (mobile) / 40px (≥1024px).
- **Section rhythm:** 56px vertical on mobile, 72px desktop. Not the old 100px+.
- **Radius:** `4px` default (cards, buttons, inputs, chips), `8px` for large media panels, `999px` for avatars and filter pills.
- **Elevation:**
  - rest: `0 1px 2px rgba(0,0,0,0.04)`
  - hover: `0 4px 14px rgba(0,0,0,0.10)`
  - overlay/dropdown: `0 8px 28px rgba(0,0,0,0.14)`
- **Z-index scale:** 10 sticky header · 20 dropdowns · 30 drawers · 50 modals/toasts.

---

## 5. Component specs

### Header (sticky, z-10)
Two rows on desktop, collapsing to one on mobile.
- **Row 1** (72px, white, `border-bottom: 1px solid --gf-line`): logo · search field (flex-1, max 620px) · nav links · Sign in · "List your app" (outlined amber).
- **Search field:** 40px tall, `--gf-line` border, radius 4px, trailing 40×40 amber square button with a Lucide `Search` glyph. Focus → `--gf-line-strong` border, no glow.
- **Row 2** (48px, white, `border-bottom`): horizontal category links, 14px/500, `--gf-text-2`, amber 2px underline on active. Horizontally scrollable on mobile, no scrollbar.

### Gig card (the listing card)
Fixed vertical order — never reorder:
1. **Thumbnail** 16:9, `object-cover`, radius 4px top. Save (heart) button top-right on a 32px white/80 circle.
2. **Seller row** — 24px avatar circle (amber→rust gradient, initial in `--gf-text`), name 14px/600, level badge 12px/600 in `--gf-surface-2` pill.
3. **Title** — 16px/500, `--gf-text`, `line-clamp: 2`, min-height reserved for 2 lines so cards align.
4. **Rating** — `--gf-star` star glyph, bold score, `(n)` in `--gf-text-2`. When a listing has no reviews, render a `New` pill — **never a fabricated score**.
5. **Tag row** — up to 3 pills, 12px, `--gf-surface-2` fill.
6. **Footer** — `border-top: 1px solid --gf-line`, save icon left, `From £X` right (13px "From" in `--gf-text-2`, price 16px/700 in `--gf-text`).

Hover: border → `--gf-line-strong`, shadow → hover elevation. **No transform/scale** (causes layout shift in grids). `cursor: pointer` on the whole card; the title is the real `<a>`.

### Carousel row
Section title + count on the left, prev/next 32px circular buttons on the right (hidden <768px). Track: `display:flex; overflow-x:auto; scroll-snap-type: x mandatory;` children `scroll-snap-align: start`, 280px basis. Scrollbar hidden. Arrows are `aria-label`led and disabled at the ends.

### Category tile
88px square-ish tile, centred Lucide icon (24px, `--gf-amber-ink`) over a 13px/500 label. Border `--gf-line`, radius 4px, hover → amber border + `--gf-amber-tint` fill.

### Buttons
| Variant | Fill | Text | Border |
|---|---|---|---|
| Primary | `--gf-amber` → hover `--gf-amber-hover` | `--gf-text` | none |
| Secondary | transparent → hover `--gf-surface-2` | `--gf-text` | `--gf-line-strong` |
| Ghost | transparent → hover `--gf-surface-2` | `--gf-text-2` | none |
| Dark | `--gf-ink-surface` | `#fff` | none |

40px tall (44px on touch), radius 4px, 16px horizontal padding, 15px/600 label, sentence case. Focus: `outline: 2px solid --gf-amber-ink; outline-offset: 2px`.

### Back-office (admin + seller dashboard)
- Page background `--gf-surface-2`; content panels white with `--gf-line` border, radius 4px.
- **Sidebar** 232px, white, sticky, `border-right: 1px solid --gf-line`. Items 14px/500, 36px tall, active = `--gf-amber-tint` fill + `--gf-text` + 2px amber left rule. Collapses to the existing horizontal tab strip below 900px.
- **Stat tile:** label 13px `--gf-text-2` → value 28px/700 `--gf-text` → delta 13px in `--gf-success`/`--gf-danger`.
- **Table:** header row `--gf-surface-2`, 12px/600 uppercase-off labels, cells 14px, 44px row height, `border-bottom: 1px solid --gf-line`, row hover `--gf-surface-2`. Right-align numeric columns and use `font-variant-numeric: tabular-nums`.
- **Status pills:** live → `--gf-success`, draft → `--gf-info`, archived → `--gf-text-3`, all on a 10%-alpha tint of their own hue.

---

## 6. Imagery

Source: **Pexels** (attribution-free licence, credit still recorded in `public/img/CREDITS.md`). Used for hero, category-band, and value-prop art only. Product thumbnails come from real seller screenshots or a generated gradient+glyph fallback — a stock photo on a software listing misrepresents the product.

All `next/image` with explicit `width`/`height` (or `fill` + sized parent), `priority` on the hero only, `loading="lazy"` elsewhere, and descriptive `alt`.

---

## 7. Anti-patterns (do not reintroduce)

- Display serif or monospace for UI chrome — reads editorial, not marketplace.
- Uppercase + `letter-spacing: 0.2em` micro-labels.
- Full-viewport hero (`min-height: 100vh`) — pushes listings below the fold.
- Rotated / floating / auto-animating cards.
- Grain overlays, custom cursors, marquee tickers.
- `transform: scale()` on grid card hover.
- Emoji as iconography — use Lucide SVG (already a dependency).
- Fabricated ratings or review counts on listings with no reviews.

---

## 8. Pre-delivery checklist

- [ ] Body text ≥16px on mobile; `--gf-text-3` never used below 18px
- [ ] All interactive elements `cursor-pointer` + visible `:focus-visible` ring
- [ ] Icon-only buttons carry `aria-label`
- [ ] Images have `alt`, explicit dimensions, lazy below the fold
- [ ] Transitions 150–250ms on colour/shadow/opacity only
- [ ] `prefers-reduced-motion: reduce` disables carousel smooth-scroll and all transitions
- [ ] No horizontal page scroll at 375 / 768 / 1024 / 1440
- [ ] Card grids align: titles clamp to 2 lines with reserved height
