# FORGE — Project Context for Claude Code Sessions

> Paste the block from `docs/specs/forge-handover.docx` Section 7 at the start of every Claude Code session.

## What is FORGE?

FORGE is an AI builder marketplace. Connects AI builders (sellers) with small businesses (buyers).

- **Sellers:** Submit a product URL → AI generates a full sales page automatically
- **Buyers:** Browse AI-built tools, buy licences or exclusive rights

## Tech Stack (MVP — Tier 1 Free)

| Tool | Role | Tier |
|------|------|------|
| Framer | Frontend / CMS | Free |
| Supabase | Database + Auth | Free |
| n8n (Railway) | Automation | Free |
| Firecrawl | URL Scraping | Free (500/mo) |
| Claude API | AI Page Generation | Pay-as-you-go ~$0.20/page |
| Resend | Email | Free (3k/mo) |
| Stripe | Payments | Free / % per txn |

## Database Tables

- `sellers` — profiles linked to Supabase auth
- `products` — listings (draft/live/archived)
- `sales_pages` — AI-generated copy per product
- `purchases` — buyer transaction records
- `reviews` — buyer ratings
- `error_log` — automation failure logging

## 8 Build Sessions

1. Supabase Foundation — schema + auth
2. Framer Site Structure — 5 page templates
3. Seller Registration Flow
4. Product Submission Form
5. n8n Workflow — Firecrawl + Claude API
6. n8n Workflow — Supabase write + email
7. Seller Draft Review Interface
8. Public Product Listing Page

## Key Files

- `docs/specs/forge-tech-spec-v2.docx` — Full technical spec
- `docs/specs/forge-handover.docx` — Claude Code handover (START HERE)
- `supabase/migrations/` — SQL migrations (generated in Session 1)

## Critical Path

Seller registers → submits product URL → Firecrawl crawls URL → Claude API generates sales page → Seller reviews + publishes → Buyer views + purchases
