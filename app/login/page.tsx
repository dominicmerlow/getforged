import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Nav from '@/components/nav'
import Footer from '@/components/footer'
import { auth } from '@/auth'
import { dbConfigured } from '@/lib/db'
import LoginForm from './LoginForm'

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your GetForged seller account.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  const session = await auth()
  if (session?.user) redirect('/dashboard')

  return (
    <>
      <Nav showCategories={false} />
      <main>
        <section className="section" style={{ display: 'grid', placeItems: 'center', minHeight: '70vh' }}>
          <div style={{ display: 'grid', gap: 24, maxWidth: 420, width: '100%', justifyItems: 'start' }}>
            <div className="section-tag">Sellers</div>
            <h1 className="section-title" style={{ fontSize: 'clamp(40px,5vw,64px)', margin: 0 }}>
              Sign in
            </h1>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 20, margin: 0 }}>
              Use a password, a magic link, or continue with Google or GitHub.
            </p>

            {!dbConfigured() && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, padding: 12, border: '1px dashed var(--ink)' }}>
                <code>DATABASE_URL</code> is not set. Sign-in won&apos;t work until the database is configured.
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
