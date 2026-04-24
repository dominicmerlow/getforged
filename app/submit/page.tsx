import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Nav from '@/components/nav'
import Footer from '@/components/footer'
import { createClient } from '@/lib/supabase/server'
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
