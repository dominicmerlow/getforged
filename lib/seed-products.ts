// Seed data used for local dev and as a graceful fallback when Supabase
// env vars are placeholders. Once real products are in the DB, `listLiveProducts`
// and `getProductBySlug` return from Supabase and this seed is ignored.

export interface SeedProduct {
  slug: string
  title: string
  tagline: string
  description: string
  category: string
  tags: string[]
  priceMain: string
  priceSub: string
  type: 'Licensed' | 'Exclusive'
  thumb: string
  emoji: string
  price_licensed: number | null
  price_exclusive: number | null
  features: string[]
  use_cases: string[]
}

export const SEED_PRODUCTS: SeedProduct[] = [
  {
    slug: 'invoicebot-pro',
    title: 'InvoiceBot Pro',
    tagline: 'Invoices that chase themselves.',
    description:
      'Automatically generates, sends and chases invoices from your Notion workspace. Zero manual effort.',
    category: 'AI Automation',
    tags: ['Claude Code', 'Notion API', 'Stripe'],
    priceMain: '£149',
    priceSub: 'one-time licence',
    type: 'Licensed',
    thumb: 't1',
    emoji: '⚡',
    price_licensed: 149,
    price_exclusive: null,
    features: [
      'Pulls billable work from your Notion workspace on a schedule',
      'Generates branded PDF invoices and sends via Stripe',
      'Chases overdue invoices with a three-touch email sequence',
    ],
    use_cases: [
      'Freelance agencies with Notion-based project tracking',
      'Consultants billing retainers plus hourly overage',
      'Solo operators who want to stop chasing money',
    ],
  },
  {
    slug: 'clientportal-ai',
    title: 'ClientPortal.ai',
    tagline: 'Your client experience, white-labelled.',
    description:
      'White-label client portal with project updates, secure file sharing, and two-way messaging.',
    category: 'Web App',
    tags: ['Cursor', 'Supabase', 'React'],
    priceMain: '£1,200',
    priceSub: 'exclusive buy-out',
    type: 'Exclusive',
    thumb: 't2',
    emoji: '🌐',
    price_licensed: null,
    price_exclusive: 1200,
    features: [
      'Branded client login with logo and colour overrides',
      'Project dashboards with status, next steps, and invoices',
      'Secure file upload + audit log per project',
    ],
    use_cases: [
      'Design studios that bill £10k+ projects',
      'Marketing agencies managing multiple retainers',
      'Any service business replacing shared Google Drives',
    ],
  },
  {
    slug: 'leadtrackr',
    title: 'LeadTrackr',
    tagline: 'CRM without the bloat.',
    description:
      "Lightweight CRM for service businesses. Tracks leads, follow-ups, and pipeline without the bloat of Salesforce.",
    category: 'CRM & Sales',
    tags: ['Airtable', 'Make', 'No-Code'],
    priceMain: '£89',
    priceSub: 'per month',
    type: 'Licensed',
    thumb: 't3',
    emoji: '📊',
    price_licensed: 89,
    price_exclusive: null,
    features: [
      'Kanban pipeline with drag-and-drop stages',
      'Follow-up reminders pushed to Slack or email',
      'Close-rate analytics per source',
    ],
    use_cases: [
      'Trades and contractors quoting jobs',
      'Small B2B teams under 10 reps',
      'Agencies tracking inbound enquiries',
    ],
  },
  {
    slug: 'reviewradar',
    title: 'ReviewRadar',
    tagline: 'Reply to every review in under a minute.',
    description:
      'Monitors Google & Trustpilot reviews. Alerts you instantly. Drafts AI-generated responses for your approval.',
    category: 'Marketing',
    tags: ['Lovable', 'Claude API', 'Resend'],
    priceMain: '£49',
    priceSub: 'per month',
    type: 'Licensed',
    thumb: 't4',
    emoji: '📧',
    price_licensed: 49,
    price_exclusive: null,
    features: [
      'Polls Google Business Profile and Trustpilot hourly',
      'Drafts tone-matched replies you approve in one click',
      'Slack alerts for any review under 4 stars',
    ],
    use_cases: [
      'Hospitality and local services with review-driven SEO',
      'Multi-location chains triaging reviews centrally',
      'Anyone losing time to reply copy-pasting',
    ],
  },
  {
    slug: 'shopbot-assistant',
    title: 'ShopBot Assistant',
    tagline: 'A salesperson for your Shopify store.',
    description:
      'AI chatbot trained on your product catalogue. Answers customer questions, recommends products, reduces support tickets by 60%.',
    category: 'E-Commerce',
    tags: ['Windsurf', 'Shopify', 'Claude API'],
    priceMain: '£199',
    priceSub: 'one-time licence',
    type: 'Licensed',
    thumb: 't5',
    emoji: '🏪',
    price_licensed: 199,
    price_exclusive: null,
    features: [
      'Trains on your Shopify catalogue automatically',
      'Recommends bundles and upsells in-conversation',
      'Escalates to human support with full chat context',
    ],
    use_cases: [
      'Shopify stores with 50+ SKUs',
      'Brands with a repetitive customer-service inbox',
      'Stores testing conversational commerce',
    ],
  },
  {
    slug: 'bookingbridge',
    title: 'BookingBridge',
    tagline: 'Bookings without the monthly bill.',
    description:
      'Embeddable booking system for service businesses. Syncs with Google Calendar. SMS reminders. Zero monthly fees.',
    category: 'Operations',
    tags: ['Bubble', 'Google API', 'Twilio'],
    priceMain: '£299',
    priceSub: 'one-time licence',
    type: 'Licensed',
    thumb: 't6',
    emoji: '📅',
    price_licensed: 299,
    price_exclusive: null,
    features: [
      'Two-way Google Calendar sync',
      'SMS reminders at 24h and 1h pre-appointment',
      'Embed snippet that drops into any site',
    ],
    use_cases: [
      'Salons, clinics, and studios booking 20+ slots a day',
      'Coaches replacing Calendly monthly fees',
      'Local services with high no-show rates',
    ],
  },
]

export function findSeedBySlug(slug: string): SeedProduct | null {
  return SEED_PRODUCTS.find(p => p.slug === slug) ?? null
}
