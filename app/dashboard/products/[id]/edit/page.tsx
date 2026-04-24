import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Nav from '@/components/nav'
import Footer from '@/components/footer'
import { createClient } from '@/lib/supabase/server'
import type { Product, SalesPage } from '@/lib/types'
import EditForm from './EditForm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Edit product',
}

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) redirect('/login')

  const { data, error } = await supabase
    .from('products')
    .select('*, sales_page:sales_pages(*), seller:sellers!inner(user_id, display_name)')
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  const product = data as Product
  const sellerRow = Array.isArray(product.seller) ? product.seller[0] : product.seller
  if (!sellerRow || sellerRow.user_id !== userData.user.id) {
    // Not the owner — hide existence, same UX as not found
    notFound()
  }

  const salesPage = Array.isArray(product.sales_page)
    ? (product.sales_page[0] ?? null)
    : (product.sales_page ?? null)

  return (
    <>
      <Nav />
      <main>
        <section className="section">
          <div className="section-tag">Editing</div>
          <h1 className="section-title" style={{ fontSize: 'clamp(32px,4vw,56px)' }}>
            {product.title}
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#6b6b6b', marginTop: 8 }}>
            Status: {product.status} · /{product.slug ?? '—'}
          </p>

          <div style={{ marginTop: 40 }}>
            <EditForm product={product} salesPage={salesPage as SalesPage | null} />
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
