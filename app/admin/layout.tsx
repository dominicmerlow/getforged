import type { ReactNode } from 'react'
import Nav from '@/components/nav'
import AdminTabs from '@/components/AdminTabs'

/**
 * Admin section layout — a back-office shell, not a marketing page.
 *
 * The public header stays (admins need a route back to the site) but the
 * category strip and the footer are dropped: neither belongs in a console, and
 * the footer's four columns of marketing links pushed real content up the page
 * on every admin screen.
 *
 * Content sits on a grey canvas with white panels, which is what makes tables
 * and stat tiles read as data rather than as page sections.
 *
 * NOTE: auth gating stays per-page rather than here — each page already calls
 * checkAdminAccess() and redirects. Centralising would add a redundant lookup
 * on top of the page's own.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Nav showCategories={false} />
      <div className="gf-admin">
        <AdminTabs />
        <main className="gf-admin-main">{children}</main>
      </div>
    </>
  )
}
