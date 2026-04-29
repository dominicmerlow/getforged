import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import Nav from '@/components/nav'
import Footer from '@/components/footer'
import { createClient } from '@/lib/supabase/server'
import { getSetting } from '@/lib/settings'
import SubmitForm from './SubmitForm'

export const metadata: Metadata = {
  title: 'Submit a product',
  description: 'List your AI-built product on FORGE. Drop a URL, get a full sales page.',
}

export const dynamic = 'force-dynamic'

function supabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return !!url && !!key && !url.includes('YOUR_PROJECT') && !key.startsWith('your_')
}

export default async function SubmitPage() {
  if (!supabaseConfigured()) {
    return (
      <>
        <Nav />
        <main>
          <section className="section">
            <div className="section-tag">Submit</div>
            <h1 className="section-title" style={{ fontSize: 'clamp(32px,4vw,56px)' }}>
              Not connected
            </h1>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 20, maxWidth: 640, marginTop: 16 }}>
              Set Supabase env vars to enable product submissions.
            </p>
          </section>
        </main>
        <Footer />
      </>
    )
  }

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    redirect('/login')
  }

  // Submissions paused gate (admin feature flag). Defence-in-depth — the
  // server action also enforces this. Fail-OPEN if the read throws so a
  // transient Supabase error doesn't block the page.
  let submissionsPaused = false
  try {
    submissionsPaused = await getSetting('site.submissions_paused')
  } catch (err) {
    console.error('[submit] submissions_paused check failed (failing open):', err)
  }

  if (submissionsPaused) {
    return (
      <>
        <Nav />
        <main>
          <section
            className="section"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: 16,
              paddingTop: 64,
              paddingBottom: 64,
            }}
          >
            <div className="section-tag">Paused</div>
            <h1
              style={{
                fontFamily: 'var(--font-bebas)',
                fontSize: 'clamp(48px,7vw,96px)',
                letterSpacing: '0.02em',
                lineHeight: 1,
                margin: 0,
              }}
            >
              Submissions paused
            </h1>
            <p
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 20,
                maxWidth: 560,
                marginTop: 8,
              }}
            >
              We&apos;re not accepting new product submissions right now. Existing listings keep selling — check back soon.
            </p>
            <Link
              href="/browse"
              className="btn-hero-primary"
              style={{ padding: '12px 24px', marginTop: 16 }}
            >
              Back to browse →
            </Link>
          </section>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Nav />
      <main>
        <section className="section">
          <div className="section-tag">List your app</div>
          <h1 className="section-title" style={{ fontSize: 'clamp(40px,5.5vw,72px)' }}>
            Drop a URL. <span>We&apos;ll do the rest.</span>
          </h1>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 22, maxWidth: 720, marginTop: 16 }}>
            We scrape your product page, generate a compelling sales page with AI, and put it in your dashboard as a draft. You review, edit if needed, then hit approve to go live.
          </p>

          <div style={{ marginTop: 48 }}>
            <SubmitForm />
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
