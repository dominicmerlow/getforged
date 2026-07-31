import type { ReactNode } from 'react'
import Nav from '@/components/nav'
import DashboardNav from '@/components/DashboardNav'

/**
 * Seller console shell — same shape as /admin.
 *
 * Auth gating stays per-page: each dashboard route already resolves the seller
 * row and redirects, and doing it here as well would duplicate that lookup on
 * every navigation.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Nav showCategories={false} />
      <div className="gf-admin">
        <DashboardNav />
        <main className="gf-admin-main">{children}</main>
      </div>
    </>
  )
}
