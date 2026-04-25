import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default async function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0c0b09',
          borderRadius: '32px',
        }}
      >
        <svg width="140" height="140" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <path d="M30 10 L38 20 L32 17.5 L26 20 Z" fill="#f5a623" />
          <path d="M6 28 L10 23 L52 23 L52 31 L42 31 L42 40 L56 40 Q58 40 58 42 L58 47 Q58 49 56 49 L8 49 Q6 49 6 47 L6 42 Q6 40 8 40 L22 40 L22 31 L10 31 Z" fill="#e8920a" />
        </svg>
      </div>
    ),
    { ...size },
  )
}
