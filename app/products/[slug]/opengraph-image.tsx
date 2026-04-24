import { ImageResponse } from 'next/og'
import { getProductBySlug } from '@/lib/products'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const product = await getProductBySlug(slug)

  // Load Inter as a fallback font (standard next/og pattern)
  const interRes = await fetch(
    'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff'
  )
  const interData = await interRes.arrayBuffer()

  if (!product) {
    // Generic branded fallback
    return new ImageResponse(
      (
        <div
          style={{
            width: 1200,
            height: 630,
            backgroundColor: '#fbf6ec',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          <div
            style={{
              fontSize: 24,
              color: '#b97314',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              marginBottom: 24,
            }}
          >
            GetForged
          </div>
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: '#2a2217',
              textAlign: 'center',
              maxWidth: 900,
              lineHeight: 1.15,
            }}
          >
            AI-built apps, ready to own.
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: 40,
              right: 56,
              fontSize: 20,
              color: '#b97314',
              letterSpacing: '0.05em',
            }}
          >
            getforged.io
          </div>
        </div>
      ),
      {
        ...size,
        fonts: [{ name: 'Inter', data: interData, style: 'normal', weight: 400 }],
      }
    )
  }

  const priceLabel =
    product.type === 'Exclusive'
      ? product.price_exclusive
        ? `£${product.price_exclusive.toLocaleString('en-GB')} exclusive`
        : product.priceMain
      : product.price_licensed
      ? `£${product.price_licensed.toLocaleString('en-GB')} licence`
      : product.priceMain

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          backgroundColor: '#fbf6ec',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '56px 64px',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {/* Top: branding + category */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              fontSize: 20,
              color: '#b97314',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            GetForged
          </div>
          <div
            style={{
              width: 1,
              height: 20,
              backgroundColor: '#b97314',
              opacity: 0.4,
            }}
          />
          <div
            style={{
              fontSize: 16,
              color: '#2a2217',
              opacity: 0.6,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            {product.category}
          </div>
        </div>

        {/* Middle: title + tagline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: '#2a2217',
              lineHeight: 1.1,
              maxWidth: 950,
            }}
          >
            {product.title}
          </div>
          <div
            style={{
              fontSize: 26,
              color: '#2a2217',
              opacity: 0.7,
              maxWidth: 820,
              lineHeight: 1.4,
            }}
          >
            {product.tagline}
          </div>
        </div>

        {/* Bottom: price + url */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <div
              style={{
                backgroundColor: '#2a2217',
                color: '#fbf6ec',
                fontSize: 18,
                fontWeight: 600,
                padding: '10px 22px',
                borderRadius: 6,
                letterSpacing: '0.03em',
              }}
            >
              {priceLabel}
            </div>
            <div
              style={{
                border: '1px solid #b97314',
                color: '#b97314',
                fontSize: 15,
                fontWeight: 500,
                padding: '10px 18px',
                borderRadius: 6,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              {product.type}
            </div>
          </div>
          <div
            style={{
              fontSize: 22,
              color: '#b97314',
              letterSpacing: '0.05em',
              fontWeight: 500,
            }}
          >
            getforged.io
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Inter', data: interData, style: 'normal', weight: 400 },
        { name: 'Inter', data: interData, style: 'normal', weight: 700 },
      ],
    }
  )
}
