import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'GetForged — AI App Marketplace'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#0c0b09',
          padding: '80px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <svg width="96" height="96" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
            <path d="M30 4 L38 15 L32 12 L26 15 Z" fill="#f5a623" />
            <path d="M2 24 L6 18 L52 18 L52 28 L42 28 L42 40 L58 40 Q60 40 60 42 L60 48 Q60 50 58 50 L6 50 Q4 50 4 48 L4 42 Q4 40 6 40 L22 40 L22 28 L6 28 Z" fill="#e8920a" />
          </svg>
          <div style={{ display: 'flex', fontSize: '72px', fontWeight: 700, letterSpacing: '0.04em', color: '#f0ebe2' }}>
            GET<span style={{ color: '#e8920a' }}>FORGED</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ fontSize: '64px', fontWeight: 600, color: '#f0ebe2', lineHeight: 1.1, maxWidth: '900px' }}>
            Pre-built AI apps for small business.
          </div>
          <div style={{ fontSize: '32px', color: '#b8b0a4' }}>
            Installed in hours, not months. From £49.
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
