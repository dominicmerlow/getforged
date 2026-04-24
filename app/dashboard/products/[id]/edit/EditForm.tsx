'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import type { Product, SalesPage } from '@/lib/types'
import MultiSelect from '@/components/MultiSelect'
import { saveProduct, deleteProduct, type EditState } from './actions'

const PLATFORM_OPTIONS = [
  'Web', 'iOS', 'Android',
  'Desktop (Mac)', 'Desktop (Windows)', 'Desktop (Linux)',
  'CLI', 'Browser Extension', 'API', 'Slack App', 'Shopify App', 'WordPress Plugin',
] as const

const ARCHITECTURE_OPTIONS = [
  'SaaS (hosted)', 'Self-hosted', 'Hybrid', 'Client-side', 'API-only', 'Embeddable widget',
] as const

const AI_MODEL_OPTIONS = [
  'Claude Opus 4.1', 'Claude Sonnet 4.5', 'Claude Haiku 4.5',
  'GPT-5', 'GPT-4o', 'GPT-4o mini', 'o3', 'o1',
  'Gemini 2.5 Pro', 'Gemini 2.5 Flash', 'Gemini 2.0 Flash',
  'DeepSeek V3.1', 'DeepSeek R1',
  'Llama 3.3 70B', 'Llama 4',
  'Qwen 2.5 72B', 'Mistral Large',
  'None (no AI)',
] as const

const INTEGRATION_OPTIONS = [
  'Notion', 'Slack', 'Discord', 'Airtable', 'Google Sheets', 'Google Calendar',
  'Microsoft 365', 'Zapier', 'Make', 'n8n',
  'Shopify', 'WooCommerce', 'Stripe', 'PayPal',
  'HubSpot', 'Salesforce', 'Pipedrive', 'Attio',
  'Twilio', 'SendGrid', 'Resend', 'Mailchimp',
  'GitHub', 'GitLab', 'Linear', 'Jira',
  'AWS S3', 'Cloudflare R2', 'Supabase Storage',
] as const

const TOOL_TAG_OPTIONS = [
  'Next.js', 'React', 'Vue', 'Svelte', 'Astro',
  'Supabase', 'Firebase', 'PlanetScale', 'Postgres', 'MongoDB',
  'Vercel', 'Netlify', 'Railway', 'Fly.io', 'AWS', 'GCP',
  'Cursor', 'Windsurf', 'Claude Code', 'Bolt', 'Lovable', 'v0',
  'OpenAI API', 'Anthropic API', 'OpenRouter', 'Groq',
  'Tailwind CSS', 'shadcn/ui',
  'Tauri', 'Electron', 'React Native', 'Expo', 'Flutter',
] as const

const CATEGORIES = ['AI Automation', 'Web App', 'CRM & Sales', 'Marketing', 'E-Commerce', 'Operations', 'Analytics', 'Content', 'Other']

const inputStyle: React.CSSProperties = {
  padding: '12px 14px',
  fontFamily: 'var(--font-mono)',
  fontSize: 14,
  border: '1px solid var(--ink)',
  background: 'var(--paper)',
  color: 'var(--ink)',
  outline: 'none',
  width: '100%',
}

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  fontFamily: 'var(--font-serif)',
  fontSize: 15,
  minHeight: 80,
  lineHeight: 1.5,
}

const sectionStyle: React.CSSProperties = {
  borderTop: '1px solid rgba(12,11,9,0.15)',
  paddingTop: 28,
  marginTop: 28,
  display: 'grid',
  gap: 16,
}

function toLineList(
  items: { title?: string | null; description?: string | null }[] | null | undefined
): string {
  if (!items) return ''
  return items
    .map(i => (i.description ? `${i.title ?? ''} | ${i.description}` : i.title ?? ''))
    .join('\n')
}

export default function EditForm({
  product,
  salesPage,
}: {
  product: Product
  salesPage: SalesPage | null
}) {
  const [state, action, pending] = useActionState<EditState, FormData>(
    saveProduct.bind(null, product.id),
    null
  )

  const ok = state && 'ok' in state && state.ok
  const error = state && 'error' in state ? state.error : null

  const features = (product.features ?? []) as { title?: string; description?: string }[]
  const useCases = (product.use_cases ?? []) as { title?: string; description?: string }[]

  return (
    <div style={{ display: 'grid', gap: 24, maxWidth: 900 }}>
      {ok && (
        <div className="product-card" style={{ padding: 16, borderLeft: '3px solid #3fa85a', fontFamily: 'var(--font-mono)', fontSize: 14 }}>
          ✓ Saved. <Link href="/dashboard" style={{ textDecoration: 'underline' }}>Back to dashboard</Link>
          {state?.slug && (
            <>
              {' · '}
              <Link href={`/products/${state.slug}`} style={{ textDecoration: 'underline' }}>Preview</Link>
            </>
          )}
        </div>
      )}

      {error && (
        <div className="product-card" style={{ padding: 16, borderLeft: '3px solid #c04a1b', fontFamily: 'var(--font-mono)', fontSize: 14, color: '#c04a1b' }}>
          {error}
        </div>
      )}

      <form action={action} style={{ display: 'grid', gap: 0 }}>
        {/* ── Core ──────────────────────────────────────── */}
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="section-tag">Core</div>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>Product name</span>
            <input type="text" name="title" defaultValue={product.title} required style={inputStyle} />
          </label>

          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr' }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>URL slug</span>
              <input type="text" name="slug" defaultValue={product.slug ?? ''} style={inputStyle} />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>Category</span>
              <select name="category" defaultValue={product.category ?? ''} style={inputStyle}>
                <option value="">Choose…</option>
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>Short tagline</span>
            <input type="text" name="tagline" defaultValue={product.tagline ?? ''} style={inputStyle} />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>Description (1–2 sentences)</span>
            <textarea name="description" defaultValue={product.description ?? ''} rows={3} style={textareaStyle} />
          </label>
        </div>

        {/* ── Pricing ──────────────────────────────────── */}
        <div style={sectionStyle}>
          <div className="section-tag">Pricing (£)</div>
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr' }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>Licence price</span>
              <input type="number" min="0" step="1" name="price_licensed" defaultValue={product.price_licensed ?? ''} style={inputStyle} />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>Exclusive price</span>
              <input type="number" min="0" step="1" name="price_exclusive" defaultValue={product.price_exclusive ?? ''} style={inputStyle} />
            </label>
          </div>
          <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: '#6b6b6b' }}>
            Set at least one. Leave a field blank to hide that option.
          </span>
        </div>

        {/* ── Spec sheet ───────────────────────────────── */}
        <div style={sectionStyle}>
          <div className="section-tag">Spec sheet</div>
          <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: '#6b6b6b' }}>
            Comma-separated for multi-value fields.
          </span>

          <MultiSelect
            name="platform"
            label="Platforms"
            options={PLATFORM_OPTIONS}
            initial={product.platform ?? []}
            placeholder="Pick where it runs…"
          />

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>Architecture</span>
            <select name="architecture" defaultValue={product.architecture ?? ''} style={inputStyle}>
              <option value="">Choose…</option>
              {ARCHITECTURE_OPTIONS.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </label>

          <MultiSelect
            name="ai_models"
            label="Native AI models"
            options={AI_MODEL_OPTIONS}
            initial={product.ai_models ?? []}
            placeholder="Which AI models does it use?"
          />

          <MultiSelect
            name="integrations"
            label="Integrations"
            options={INTEGRATION_OPTIONS}
            initial={product.integrations ?? []}
            placeholder="Third-party services it connects to…"
          />

          <MultiSelect
            name="tool_tags"
            label="Tech stack / tools"
            options={TOOL_TAG_OPTIONS}
            initial={product.tool_tags ?? []}
            placeholder="Frameworks + tools used to build it…"
          />

          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr' }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>Approx monthly cost to maintain (£)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                name="monthly_cost"
                defaultValue={product.monthly_cost ?? ''}
                placeholder="e.g. 20"
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>Time to deploy</span>
              <input
                type="text"
                name="deploy_time"
                defaultValue={product.deploy_time ?? ''}
                placeholder="e.g. 15 minutes"
                style={inputStyle}
              />
            </label>
          </div>
        </div>

        {/* ── Links & assets ───────────────────────────── */}
        <div style={sectionStyle}>
          <div className="section-tag">Links & assets</div>
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr' }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>Demo URL</span>
              <input type="url" name="demo_url" defaultValue={product.demo_url ?? ''} style={inputStyle} />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>Video URL</span>
              <input type="url" name="video_url" defaultValue={product.video_url ?? ''} style={inputStyle} />
            </label>
          </div>
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr' }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>Docs URL</span>
              <input type="url" name="docs_url" defaultValue={product.docs_url ?? ''} style={inputStyle} />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>Repository URL</span>
              <input type="url" name="repo_url" defaultValue={product.repo_url ?? ''} style={inputStyle} />
            </label>
          </div>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>Screenshot URLs (one per line)</span>
            <textarea
              name="screenshots"
              defaultValue={(product.screenshots ?? []).join('\n')}
              rows={3}
              style={{ ...textareaStyle, fontFamily: 'var(--font-mono)', fontSize: 13 }}
              placeholder="https://example.com/shot1.png"
            />
          </label>
        </div>

        {/* ── Sales copy ───────────────────────────────── */}
        <div style={sectionStyle}>
          <div className="section-tag">Sales page copy</div>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>Headline</span>
            <input type="text" name="headline" defaultValue={salesPage?.headline ?? ''} style={inputStyle} />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>Subheadline</span>
            <input type="text" name="subheadline" defaultValue={salesPage?.subheadline ?? ''} style={inputStyle} />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>Problem statement</span>
            <textarea name="problem_statement" defaultValue={salesPage?.problem_statement ?? ''} rows={3} style={textareaStyle} />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>Features (one per line — <code>Title | description</code>)</span>
            <textarea
              name="features"
              defaultValue={toLineList(features)}
              rows={6}
              style={{ ...textareaStyle, fontFamily: 'var(--font-mono)', fontSize: 13 }}
              placeholder="Auto invoice chasing | Sends branded reminders on a schedule"
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>Use cases (one per line — <code>Title | description</code>)</span>
            <textarea
              name="use_cases"
              defaultValue={toLineList(useCases)}
              rows={4}
              style={{ ...textareaStyle, fontFamily: 'var(--font-mono)', fontSize: 13 }}
            />
          </label>

          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr' }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>Primary CTA text</span>
              <input type="text" name="cta_primary" defaultValue={salesPage?.cta_primary ?? ''} style={inputStyle} />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>Secondary CTA text</span>
              <input type="text" name="cta_secondary" defaultValue={salesPage?.cta_secondary ?? ''} style={inputStyle} />
            </label>
          </div>

          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr' }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>SEO title</span>
              <input type="text" name="meta_title" defaultValue={salesPage?.meta_title ?? ''} maxLength={60} style={inputStyle} />
            </label>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>SEO description</span>
              <input type="text" name="meta_description" defaultValue={salesPage?.meta_description ?? ''} maxLength={160} style={inputStyle} />
            </label>
          </div>
        </div>

        {/* ── Support ──────────────────────────────────── */}
        <div style={sectionStyle}>
          <div className="section-tag">Support & terms</div>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>Support terms (what buyers get after purchase)</span>
            <textarea
              name="support_terms"
              defaultValue={product.support_terms ?? ''}
              rows={3}
              style={textareaStyle}
              placeholder="e.g. Email support for 90 days, plus source code and deploy script."
            />
          </label>
        </div>

        {/* ── Save / cancel ────────────────────────────── */}
        <div style={{ ...sectionStyle, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="submit" className="btn-hero-primary" disabled={pending} style={{ padding: '14px 28px', cursor: pending ? 'wait' : 'pointer', opacity: pending ? 0.6 : 1 }}>
              {pending ? 'Saving…' : 'Save changes'}
            </button>
            <Link href="/dashboard" className="btn-hero-secondary" style={{ padding: '14px 28px' }}>
              Cancel
            </Link>
          </div>
        </div>
      </form>

      {/* Delete lives outside the main form so its button doesn't submit the edit */}
      <form action={deleteProduct.bind(null, product.id)} style={{ marginTop: 16 }}>
        <button
          type="submit"
          style={{
            background: 'transparent',
            border: '1px solid #c04a1b',
            color: '#c04a1b',
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            padding: '10px 18px',
            cursor: 'pointer',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
          onClick={(e) => {
            if (!confirm('Delete this product permanently?')) e.preventDefault()
          }}
        >
          Delete permanently
        </button>
      </form>
    </div>
  )
}
