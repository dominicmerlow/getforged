import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { products, sellers, salesPages } from '@/db/schema'
import EditForm, { type EditableProduct, type EditableSalesPage } from './EditForm'

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

  const session = await auth()
  if (!session?.user) redirect('/login')

  const row = await db
    .select({ product: products, seller: sellers, salesPage: salesPages })
    .from(products)
    .innerJoin(sellers, eq(products.sellerId, sellers.id))
    .leftJoin(salesPages, eq(salesPages.productId, products.id))
    .where(eq(products.id, id))
    .limit(1)
    .then(rows => rows[0] ?? null)

  if (!row) notFound()
  // Not the owner — hide existence, same UX as not found. This IS the
  // authorization boundary now; there is no RLS backstop.
  if (row.seller.userId !== session.user.id) notFound()

  const p = row.product
  const editableProduct: EditableProduct = {
    id: p.id,
    title: p.title,
    slug: p.slug,
    category: p.category,
    tagline: p.tagline,
    description: p.description,
    price_licensed: p.priceLicensed,
    price_exclusive: p.priceExclusive,
    platform: p.platform,
    architecture: p.architecture,
    ai_models: p.aiModels,
    integrations: p.integrations,
    tool_tags: p.toolTags,
    monthly_cost: p.monthlyCost,
    deploy_time: p.deployTime,
    demo_url: p.demoUrl,
    video_url: p.videoUrl,
    docs_url: p.docsUrl,
    repo_url: p.repoUrl,
    screenshots: p.screenshots,
    support_terms: p.supportTerms,
    features: p.features as EditableProduct['features'],
    use_cases: p.useCases as EditableProduct['use_cases'],
  }
  const editableSalesPage: EditableSalesPage | null = row.salesPage ? {
    headline: row.salesPage.headline,
    subheadline: row.salesPage.subheadline,
    problem_statement: row.salesPage.problemStatement,
    cta_primary: row.salesPage.ctaPrimary,
    cta_secondary: row.salesPage.ctaSecondary,
    meta_title: row.salesPage.metaTitle,
    meta_description: row.salesPage.metaDescription,
  } : null

  return (
    <>
      <div className="section-tag">Editing</div>
      <h1 className="gf-admin-title">{p.title}</h1>
      <p className="gf-admin-sub">Status: {p.status} · /{p.slug ?? '-'}</p>

      <EditForm product={editableProduct} salesPage={editableSalesPage} />
    </>
  )
}
