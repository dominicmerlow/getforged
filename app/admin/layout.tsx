import type { ReactNode } from 'react'
import Nav from '@/components/nav'
import Footer from '@/components/footer'
import AdminTabs from '@/components/AdminTabs'

/**
 * Admin section layout.
 *
 * Renders the public Nav + a sticky tabbed AdminTabs strip, wraps children
 * in <main>, then Footer. Pages under /admin/* now return only their
 * content (one or more <section>s) — they no longer import Nav / Footer.
 *
 * NOTE: auth gating stays per-page rather than in this layout — each page
 * already calls checkAdminAccess() and redirects accordingly. Centralising
 * here would mean a redundant DB lookup on top of the page's own.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Nav />
      <AdminTabs />
      <main>{children}</main>
      <Footer />
    </>
  )
}
