import Image from 'next/image'

interface Props {
  src: string | null | undefined
  title: string
  emoji?: string
  category?: string
  /** 'card' = compact browser chrome, no animation
   *  'hero' = full browser chrome + float + shine animation */
  size: 'card' | 'hero'
}

const KEYFRAMES = `
@keyframes ps-float {
  0%,100% { transform: translateY(0px) rotate(-1deg); }
  50%      { transform: translateY(-10px) rotate(-1deg); }
}
@keyframes ps-shine {
  0%   { transform: translateX(-120%) skewX(-20deg); }
  100% { transform: translateX(220%)  skewX(-20deg); }
}
@keyframes ps-blink {
  0%,100% { opacity:1; }
  50%      { opacity:0; }
}
`

export default function ProductScreenshot({ src, title, emoji = '⚡', category, size }: Props) {
  const isHero = size === 'hero'

  const outerStyle: React.CSSProperties = isHero
    ? {
        position: 'relative',
        width: '100%',
        animation: 'ps-float 5s ease-in-out infinite',
        filter: 'drop-shadow(0 32px 64px rgba(0,0,0,0.35)) drop-shadow(0 0 1px rgba(255,255,255,0.08))',
      }
    : {
        position: 'relative',
        width: '100%',
        height: '100%',
      }

  const frameStyle: React.CSSProperties = {
    background: '#1a1814',
    border: isHero ? '1px solid rgba(255,255,255,0.1)' : 'none',
    borderRadius: isHero ? 10 : 0,
    overflow: 'hidden',
  }

  // Chrome bar
  const chromeStyle: React.CSSProperties = {
    height: isHero ? 36 : 26,
    background: '#141210',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    display: 'flex',
    alignItems: 'center',
    padding: isHero ? '0 14px' : '0 10px',
    gap: isHero ? 7 : 5,
    flexShrink: 0,
  }

  const dotSize = isHero ? 10 : 7

  // URL bar
  const urlBarStyle: React.CSSProperties = {
    flex: 1,
    height: isHero ? 20 : 14,
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 3,
    marginLeft: isHero ? 10 : 6,
    display: 'flex',
    alignItems: 'center',
    paddingLeft: isHero ? 8 : 5,
    overflow: 'hidden',
  }

  // Derive a plausible URL from title
  const fakeUrl = title
    ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '.app'
    : 'app.getforged.io'

  // Image / fallback area
  const mediaHeight = isHero ? 'auto' : 120
  const mediaAspect = isHero ? '16 / 10' : undefined

  return (
    <>
      {isHero && <style>{KEYFRAMES}</style>}
      <div style={outerStyle}>
        <div style={frameStyle}>
          {/* Chrome bar */}
          <div style={chromeStyle}>
            {/* Traffic light dots */}
            <div style={{ width: dotSize, height: dotSize, borderRadius: '50%', background: '#e06c75', flexShrink: 0 }} />
            <div style={{ width: dotSize, height: dotSize, borderRadius: '50%', background: '#e5c07b', flexShrink: 0 }} />
            <div style={{ width: dotSize, height: dotSize, borderRadius: '50%', background: '#98c379', flexShrink: 0 }}>
              {isHero && (
                <span style={{
                  display: 'block', width: '100%', height: '100%', borderRadius: '50%',
                  background: '#98c379',
                  animation: 'ps-blink 3s ease-in-out infinite',
                }}/>
              )}
            </div>

            {/* URL bar */}
            <div style={urlBarStyle}>
              <span style={{
                fontFamily: 'DM Mono, monospace',
                fontSize: isHero ? 10 : 8,
                color: 'rgba(255,255,255,0.3)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {fakeUrl}
              </span>
            </div>

            {isHero && (
              <div style={{ marginLeft: 8, display: 'flex', gap: 4 }}>
                {['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.12)'].map((bg, i) => (
                  <div key={i} style={{ width: 16, height: 14, background: bg, borderRadius: 2 }} />
                ))}
              </div>
            )}
          </div>

          {/* Screenshot / fallback */}
          <div style={{
            position: 'relative',
            width: '100%',
            height: mediaHeight,
            aspectRatio: mediaAspect,
            overflow: 'hidden',
            background: '#0e0d0b',
          }}>
            {src ? (
              <Image
                src={src}
                alt={title}
                fill
                sizes={isHero ? '(max-width: 900px) 100vw, 55vw' : '(max-width: 768px) 100vw, 33vw'}
                style={{ objectFit: 'cover', objectPosition: 'top' }}
                unoptimized
              />
            ) : (
              <FallbackScreen emoji={emoji} category={category} isHero={isHero} />
            )}

            {/* Animated shine sweep — hero only */}
            {isHero && (
              <div style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0, bottom: 0,
                  width: '35%',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)',
                  animation: 'ps-shine 4s ease-in-out infinite',
                  animationDelay: '1s',
                }} />
              </div>
            )}

            {/* Bottom fade — card only */}
            {!isHero && (
              <div style={{
                position: 'absolute',
                bottom: 0, left: 0, right: 0,
                height: 40,
                background: 'linear-gradient(to bottom, transparent, rgba(26,24,20,0.9))',
                pointerEvents: 'none',
              }} />
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Fallback screen when no screenshot ────────────────────────────────────

function FallbackScreen({ emoji, category, isHero }: { emoji?: string; category?: string; isHero: boolean }) {
  const rows = isHero ? 5 : 3

  return (
    <div style={{
      width: '100%',
      height: '100%',
      minHeight: isHero ? 320 : 120,
      background: '#0e0d0b',
      display: 'flex',
      flexDirection: 'column',
      padding: isHero ? '20px 24px' : '10px 12px',
      gap: isHero ? 10 : 6,
    }}>
      {/* Fake UI rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: isHero ? 10 : 6, alignItems: 'center' }}>
          <div style={{
            width: isHero ? 32 : 18,
            height: isHero ? 20 : 10,
            background: i === 0 ? 'rgba(185,115,20,0.5)' : 'rgba(255,255,255,0.07)',
            borderRadius: 2,
            flexShrink: 0,
          }} />
          <div style={{
            flex: 1,
            height: isHero ? 20 : 10,
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 2,
          }} />
          {i % 2 === 0 && (
            <div style={{
              width: isHero ? 60 : 30,
              height: isHero ? 20 : 10,
              background: 'rgba(255,255,255,0.04)',
              borderRadius: 2,
              flexShrink: 0,
            }} />
          )}
        </div>
      ))}

      {/* Centre emoji */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        opacity: 0.55,
      }}>
        <span style={{ fontSize: isHero ? 52 : 28 }}>{emoji ?? '⚡'}</span>
        {isHero && category && (
          <span style={{
            fontFamily: 'DM Mono, monospace',
            fontSize: 13,
            color: 'rgba(185,115,20,0.8)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>
            {category}
          </span>
        )}
      </div>
    </div>
  )
}
