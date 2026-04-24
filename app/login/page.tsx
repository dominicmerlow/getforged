import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Nav from '@/components/nav'
import Footer from '@/components/footer'
import { createClient } from '@/lib/supabase/server'
import LoginForm from './LoginForm'

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your FORGE seller account with a magic link.',
}

function supabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return !!url && !!key && !url.includes('YOUR_PROJECT') && !key.startsWith('your_')
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

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
          <div style={{ display: 'grid', gap: 24, maxWidth: 420, width: '100%', justifyItems: 'start' }}>
            <div className="section-tag">Sellers</div>
            <h1 className="section-title" style={{ fontSize: 'clamp(40px,5vw,64px)', margin: 0 }}>
              Sign in
            </h1>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 20, margin: 0 }}>
              We&apos;ll email you a one-time link. No passwords.
            </p>

            {!supabaseConfigured() && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, padding: 12, border: '1px dashed var(--ink)' }}>
                Supabase env vars are still placeholders — magic links won&apos;t send until you set
                {' '}<code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in <code>.env.local</code>.
              </p>
            )}

            {error && (
              <p style={{ color: '#c04a1b', fontFamily: 'var(--font-mono)', fontSize: 14 }}>
                Sign-in failed: {error}
              </p>
            )}

            <LoginForm />
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
