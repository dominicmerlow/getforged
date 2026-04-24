import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Nav from '@/components/nav'
import Footer from '@/components/footer'
import ScrollReveal from '@/components/scroll-reveal'
import { listLiveProducts } from '@/lib/products'
import BrowseClient from '@/components/BrowseClient'
import CategoryHeroIllustration from '@/components/CategoryHeroIllustration'

export const revalidate = 60

interface CategoryMeta {
  slug: string
  label: string
  dbValue: string
  h1: string
  tagline: string
  description: string
  useCases: string[]
  metaTitle: string
  metaDescription: string
}

const CATEGORIES: CategoryMeta[] = [
  {
    slug: 'ai-automation',
    label: 'AI Automation',
    dbValue: 'AI Automation',
    h1: 'AI Automations for small businesses',
    tagline: 'Stop doing it manually.',
    description:
      'Ready-to-deploy automation tools that wire up your inbox, CRM, invoices, and workflows — without writing a line of code. Built by AI developers, priced like software.',
    useCases: [
      'Auto-route inbound leads to the right rep',
      'Generate invoices from completed jobs',
      'Sync data between tools without Zapier tax',
      'Trigger follow-ups when deals go cold',
    ],
    metaTitle: 'AI Automation Tools for Small Business | GetForged',
    metaDescription:
      'Buy pre-built AI automation tools for your business. Auto-route leads, sync data, trigger follow-ups — installed in hours, not months.',
  },
  {
    slug: 'web-apps',
    label: 'Web Apps & Internal Tools',
    dbValue: 'Web App',
    h1: 'Web apps & internal tools, ready to ship',
    tagline: 'Hire the app, not the developer.',
    description:
      'Full web applications and internal dashboards built with AI — portals, trackers, client-facing tools. Licence them outright instead of paying a dev agency £8k to build from scratch.',
    useCases: [
      'Client portals with real-time project status',
      'Internal ops dashboards for your team',
      'Booking and scheduling tools',
      'Document and asset management apps',
    ],
    metaTitle: 'AI-Built Web Apps & Internal Tools | GetForged',
    metaDescription:
      'Pre-built web apps and internal tools for small businesses. Client portals, dashboards, ops trackers — licence them today for a fraction of custom dev cost.',
  },
  {
    slug: 'crm-sales',
    label: 'CRM & Sales Tools',
    dbValue: 'CRM & Sales',
    h1: 'CRM & sales tools built for small teams',
    tagline: 'Close more. Chase less.',
    description:
      'AI-powered CRM tools, pipeline managers, and sales utilities designed for lean teams who can\'t afford Salesforce. One-time licence, immediate install.',
    useCases: [
      'Pipeline tracking without Salesforce complexity',
      'Auto-qualify inbound leads with AI scoring',
      'Proposal generators that pull from your CRM',
      'Follow-up schedulers tied to deal stage',
    ],
    metaTitle: 'AI-Built CRM & Sales Tools for Small Teams | GetForged',
    metaDescription:
      'CRM tools and sales automation for small businesses. Pipeline management, lead scoring, proposal generation — built by AI devs, priced for SMEs.',
  },
  {
    slug: 'marketing',
    label: 'Marketing & Growth',
    dbValue: 'Marketing',
    h1: 'Marketing & growth tools powered by AI',
    tagline: 'More leads. Less guesswork.',
    description:
      'AI-built marketing tools that generate content, qualify leads, and run outreach — without a full marketing stack. Install in hours and see results in days.',
    useCases: [
      'AI copywriting tools trained on your brand',
      'Lead magnet generators and landing page builders',
      'Email sequence builders for cold outreach',
      'Social content schedulers with AI captions',
    ],
    metaTitle: 'AI Marketing & Growth Tools for Small Business | GetForged',
    metaDescription:
      'Pre-built AI marketing tools: lead gen, content creation, email outreach, and more. Built by AI developers, ready to deploy today.',
  },
  {
    slug: 'ecommerce',
    label: 'E-Commerce',
    dbValue: 'E-Commerce',
    h1: 'AI tools built for e-commerce operators',
    tagline: 'Sell more. Support less.',
    description:
      'E-commerce tools that automate your store operations — from product descriptions to returns handling to customer support. AI-built, one-time purchase.',
    useCases: [
      'AI product description generators at scale',
      'Returns and refund workflow automation',
      'Inventory alert systems with reorder logic',
      'Post-purchase email flows and review requests',
    ],
    metaTitle: 'AI E-Commerce Tools & Automation | GetForged',
    metaDescription:
      'AI-built e-commerce tools for online store operators. Product copy, returns automation, inventory alerts — buy once, deploy immediately.',
  },
  {
    slug: 'operations',
    label: 'Operations & Workflows',
    dbValue: 'Operations',
    h1: 'Operations & workflow tools that run themselves',
    tagline: 'Your ops team, automated.',
    description:
      'AI-powered operations tools for the unglamorous work: approvals, reporting, scheduling, HR workflows, and everything between systems. Built to save hours every week.',
    useCases: [
      'Automated approval and sign-off workflows',
      'Weekly reporting tools that pull from multiple sources',
      'Staff scheduling and shift management',
      'Onboarding checklists that run on autopilot',
    ],
    metaTitle: 'AI Operations & Workflow Automation Tools | GetForged',
    metaDescription:
      'Pre-built AI operations tools for small businesses. Approval workflows, automated reporting, scheduling, and more — install in hours.',
  },
]

const SLUG_MAP = Object.fromEntries(CATEGORIES.map(c => [c.slug, c]))

export async function generateStaticParams() {
  return CATEGORIES.map(c => ({ category: c.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>
}): Promise<Metadata> {
  const { category } = await params
  const cat = SLUG_MAP[category]
  if (!cat) return {}
  return {
    title: cat.metaTitle,
    description: cat.metaDescription,
    openGraph: {
      title: cat.metaTitle,
      description: cat.metaDescription,
      type: 'website',
    },
  }
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>
}) {
  const { category } = await params
  const cat = SLUG_MAP[category]
  if (!cat) notFound()

  const products = await listLiveProducts()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: cat.metaTitle,
    description: cat.metaDescription,
    url: `${process.env.NEXT_PUBLIC_APP_URL}/browse/${cat.slug}`,
  }

  return (
    <>
      <Nav />
      <main>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        {/* Category hero */}
        <section
          style={{
            borderBottom: '1px solid var(--ink)',
            padding: 'clamp(48px, 8vw, 96px) clamp(20px, 5vw, 80px)',
            background: 'var(--ink)',
            color: 'var(--paper)',
          }}
        >
          <div
            style={{
              maxWidth: 1200,
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              gap: 'clamp(32px, 5vw, 72px)',
              flexWrap: 'wrap',
            }}
          >
            {/* Left — text */}
            <div style={{ flex: 1, minWidth: 280 }}>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  opacity: 0.6,
                  marginBottom: 16,
                }}
              >
                {cat.label}
              </div>
              <p
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontStyle: 'italic',
                  fontSize: 'clamp(18px, 2.5vw, 26px)',
                  opacity: 0.7,
                  marginBottom: 12,
                  fontWeight: 400,
                }}
              >
                {cat.tagline}
              </p>
              <h1
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 'clamp(32px, 4.5vw, 58px)',
                  fontWeight: 600,
                  lineHeight: 1.1,
                  marginBottom: 24,
                }}
              >
                {cat.h1}
              </h1>
              <p
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 18,
                  lineHeight: 1.6,
                  opacity: 0.8,
                  maxWidth: 560,
                  marginBottom: 36,
                }}
              >
                {cat.description}
              </p>

              {/* Use-case chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {cat.useCases.map(uc => (
                  <span
                    key={uc}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 13,
                      padding: '6px 14px',
                      border: '1px solid rgba(255,255,255,0.3)',
                      color: 'var(--paper)',
                      opacity: 0.85,
                    }}
                  >
                    {uc}
                  </span>
                ))}
              </div>
            </div>

            {/* Right — animated illustration */}
            <CategoryHeroIllustration slug={cat.slug} />
          </div>
        </section>

        {/* Product grid */}
        <section className="section">
          <BrowseClient products={products} initialCategory={cat.dbValue} />
        </section>
      </main>
      <Footer />
      <ScrollReveal />
    </>
  )
}
