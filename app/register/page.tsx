import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import Nav from '@/components/nav'
import Footer from '@/components/footer'
import { createClient } from '@/lib/supabase/server'
import RegisterForm from './RegisterForm'

export const metadata: Metadata = {
  title: 'Create your account',
  description: 'Join GetForged as a Founding Builder — list your AI-built apps and reach SME buyers. Free to list, 15% only when you sell.',
}

function supabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return !!url && !!key && !url.includes('YOUR_PROJECT') && !key.startsWith('your_')
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; error?: string }>
}) {
  const { plan, error } = await searchParams

  if (supabaseConfigured()) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    if (data.user) redirect('/dashboard')
  }

  return (
    <>
      <Nav />
      <main>
        <section className="section" style={{ display: 'grid', placeItems: 'center', minHeight: '70vh' }}>
          <div style={{ display: 'grid', gap: 24, maxWidth: 460, width: '100%', justifyItems: 'start' }}>
            <div className="section-tag">Founding Builder</div>
            <h1 className="section-title" style={{ fontSize: 'clamp(40px,5.5vw,64px)', margin: 0 }}>
              Create your <span>account</span>.
            </h1>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 20, margin: 0, lineHeight: 1.5 }}>
              Free to list. We earn only when you sell. Founding Builder badge for the first 50 sellers.
            </p>

            {plan === 'pro' && (
              <p style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                padding: '10px 14px',
                background: 'rgba(185,115,20,0.1)',
                border: '1px solid var(--soft-amber, #b97314)',
                color: 'var(--soft-amber, #b97314)',
                margin: 0,
              }}>
                Pro tier opens after 50 verified builders. You&apos;ll be onboarded as a Founding Builder for now — same price (free).
              </p>
            )}

            {!supabaseConfigured() && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, padding: 12, border: '1px dashed var(--ink)' }}>
                Supabase env vars are still placeholders — confirmation emails won&apos;t send until you set
                {' '}<code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
              </p>
            )}

            {error && (
              <p style={{ color: 'var(--rust, #c04a1b)', fontFamily: 'var(--font-mono)', fontSize: 14 }}>
                Sign-up failed: {error}
              </p>
            )}

            <RegisterForm />

            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#6b6b6b', margin: 0 }}>
              Already have an account? <Link href="/login" style={{ color: 'inherit', textDecoration: 'underline' }}>Sign in →</Link>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
