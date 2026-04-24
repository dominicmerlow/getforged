# FORGE — Quick Reference Cheat Sheet
# Keep this open while building

---

## Supabase Dashboard
URL: https://supabase.com/dashboard/project/[YOUR-PROJECT-REF]

| What | Where |
|---|---|
| Run SQL | SQL Editor → New query |
| View tables + data | Table Editor |
| Manage users | Authentication → Users |
| View/edit RLS policies | Authentication → Policies |
| Get API keys | Project Settings → API |
| View logs | Logs → Postgres / Auth / API |

---

## Supabase REST API (for n8n + Framer embeds)

Base URL: `https://[YOUR-PROJECT-REF].supabase.co/rest/v1/`

Headers always required:
```
apikey: [YOUR-ANON-KEY]
Authorization: Bearer [YOUR-ANON-KEY]
Content-Type: application/json
```

For writes from n8n (use service_role instead of anon):
```
apikey: [YOUR-SERVICE-ROLE-KEY]
Authorization: Bearer [YOUR-SERVICE-ROLE-KEY]
```

Common endpoints:
```
GET    /rest/v1/products?status=eq.live&select=*
GET    /rest/v1/products?slug=eq.my-product&select=*,sales_pages(*)
POST   /rest/v1/products
PATCH  /rest/v1/products?id=eq.[UUID]
GET    /rest/v1/sellers?user_id=eq.[UUID]
POST   /rest/v1/purchases
POST   /rest/v1/error_log
```

---

## n8n Workflow Names (planned)

| Workflow | Trigger | What it does |
|---|---|---|
| `forge-product-submit` | Webhook (Framer form) | Scrape → Generate → Save → Email |
| `forge-stripe-webhook` | Webhook (Stripe) | Confirm payment → Write purchase → Email buyer |
| `forge-seller-approve` | Webhook (Framer button) | Set product status to 'live' |

---

## Key Database IDs to know

After Session 1 you won't have IDs yet. Fill these in as you build:

```
Test seller user_id:     [UUID from Supabase Auth → Users]
Test product id:         [UUID from products table]
Test sales_page id:      [UUID from sales_pages table]
```

---

## Framer Custom Code Pattern

Paste this at the top of any Framer custom code embed that needs Supabase:

```javascript
const SUPABASE_URL = 'https://[YOUR-PROJECT-REF].supabase.co'
const SUPABASE_ANON_KEY = '[YOUR-ANON-KEY]'

async function supabase(method, table, params = {}, body = null) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`)
  Object.entries(params).forEach(([k,v]) => url.searchParams.set(k, v))
  const res = await fetch(url, {
    method,
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=representation' : ''
    },
    body: body ? JSON.stringify(body) : null
  })
  return res.json()
}
```

---

## Claude API (in n8n HTTP Request node)

```
Method: POST
URL: https://api.anthropic.com/v1/messages
Headers:
  x-api-key: [YOUR-ANTHROPIC-KEY]
  anthropic-version: 2023-06-01
  Content-Type: application/json

Body:
{
  "model": "claude-haiku-4-5",
  "max_tokens": 2048,
  "messages": [{
    "role": "user",
    "content": "..."
  }]
}
```

Cost reference: claude-haiku-4-5 ≈ $0.001 per 1k tokens ≈ $0.05–0.20 per sales page

---

## Firecrawl (in n8n HTTP Request node)

```
Method: POST
URL: https://api.firecrawl.dev/v1/scrape
Headers:
  Authorization: Bearer [YOUR-FIRECRAWL-KEY]
  Content-Type: application/json

Body:
{
  "url": "https://the-product-url.com",
  "formats": ["markdown"],
  "onlyMainContent": true
}

Response path: data.markdown
```

---

## Resend Email (in n8n HTTP Request node)

```
Method: POST
URL: https://api.resend.com/emails
Headers:
  Authorization: Bearer [YOUR-RESEND-KEY]
  Content-Type: application/json

Body:
{
  "from": "FORGE <noreply@[YOUR-DOMAIN]>",
  "to": ["buyer@email.com"],
  "subject": "Your FORGE listing is ready to review",
  "html": "<p>...</p>"
}
```

---

## Stripe Checkout (planned — Session 8)

```
Method: POST
URL: https://api.stripe.com/v1/checkout/sessions
Headers:
  Authorization: Bearer [YOUR-STRIPE-SECRET-KEY]
  Content-Type: application/x-www-form-urlencoded

Body:
  mode=payment
  success_url=https://[YOUR-DOMAIN]/success?session_id={CHECKOUT_SESSION_ID}
  cancel_url=https://[YOUR-DOMAIN]/products/[slug]
  line_items[0][price_data][currency]=gbp
  line_items[0][price_data][product_data][name]=Product Name
  line_items[0][price_data][unit_amount]=4999
  line_items[0][quantity]=1
```

---

## Product Status Flow

```
draft → live → archived
  ↑       ↓
  └─ (reject/edit keeps as draft)
```

Only `live` products are visible to the public (enforced by RLS).

---

## Common Errors and Fixes

| Error | Likely cause | Fix |
|---|---|---|
| `JWT expired` | Supabase session expired | User needs to log in again |
| `new row violates RLS policy` | Wrong key used / not authenticated | Use service_role key in n8n for writes |
| `duplicate key value violates unique constraint` | Slug already exists | Re-slugify with a suffix |
| `relation does not exist` | Table name typo | Check exact table name in Supabase |
| n8n webhook not triggering | Wrong URL in Framer | Copy webhook URL from n8n node again |
