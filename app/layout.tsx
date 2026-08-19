import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans, Inter } from 'next/font/google'
import PostHogProvider from '@/components/PostHogProvider'
import { CompareProvider } from '@/components/CompareProvider'
import CompareBar from '@/components/CompareBar'
import './globals.css'

/**
 * `viewportFit: "cover"` is what makes `env(safe-area-inset-*)` resolve to a
 * real value instead of 0 — without it the floating CompareBar sits under the
 * iPhone home indicator. `userScalable` is left alone so pinch-zoom stays on.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#fafaf5',
}

/*
  Two-font system (see design-system/MASTER.md §3).

  Plus Jakarta Sans is the closest freely-licensed match to Fiverr's Macan —
  geometric-humanist, tight apertures, reads as product chrome rather than
  editorial. It carries headings, buttons, prices and nav.

  Inter carries body copy and dense back-office tables, where its larger
  x-height and tabular numerals beat Jakarta at 13–14px.

  Only these two families load. The legacy `--font-serif` / `--font-mono` /
  `--font-bebas` variables are *aliased* onto them in globals.css rather than
  loading Fraunces/DM Mono/Bebas Neue — see the note there. That drops three
  font families from the critical path while silently de-serifing the ~470
  inline `var(--font-*)` references scattered across the app.
*/
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'GetForged: AI App Marketplace',
    template: '%s | GetForged',
  },
  description:
    'Buy pre-built AI apps, automations and internal tools, made by expert builders, priced for small businesses. Install in hours, not months.',
  metadataBase: new URL('https://getforged.getbrian.xyz'),
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: 'https://getforged.getbrian.xyz',
    siteName: 'GetForged',
    title: 'GetForged: AI App Marketplace',
    description: 'Buy pre-built AI apps, automations and internal tools, made by expert builders, priced for small businesses. Install in hours, not months.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GetForged: AI App Marketplace',
    description: 'Buy pre-built AI apps, automations and internal tools, made by expert builders, priced for small businesses. Install in hours, not months.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${inter.variable}`}
    >
      <body>
        <PostHogProvider>
          <CompareProvider>
            {children}
            <CompareBar />
          </CompareProvider>
        </PostHogProvider>
      </body>
    </html>
  )
}
