import type { Metadata } from 'next'
import { Bebas_Neue, Fraunces, DM_Mono, Montserrat } from 'next/font/google'
import PostHogProvider from '@/components/PostHogProvider'
import { CompareProvider } from '@/components/CompareProvider'
import CompareBar from '@/components/CompareBar'
import './globals.css'

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
  display: 'swap',
})

// Fraunces — a modern variable display serif. Replaces Instrument Serif
// which read as too calligraphic/handwritten at large sizes.
// opsz variation at 96 opens up the forms for display; weight 500-600 is
// substantial without feeling heavy.
const fraunces = Fraunces({
  // Fraunces is a variable font. To use its `opsz` + `SOFT` axes we
  // must NOT pin discrete weights — leave weight undefined so Next's
  // `next/font/google` loader treats it as variable.
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
  axes: ['opsz', 'SOFT'],
})

const dmMono = DM_Mono({
  weight: ['300', '400', '500'],
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

// Primary UI / body font — Montserrat replaces the previous Syne.
// Kept the CSS variable name as --font-sans (was --font-syne) to avoid
// the misleading legacy name. Both vars are emitted for transitional
// compatibility with any stale selectors.
const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'GetForged — AI App Marketplace',
    template: '%s | GetForged',
  },
  description:
    'Buy pre-built AI apps, automations and internal tools — made by expert builders, priced for small businesses. Install in hours, not months.',
  metadataBase: new URL('https://getforged.io'),
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: 'https://getforged.io',
    siteName: 'GetForged',
    title: 'GetForged — AI App Marketplace',
    description: 'Buy pre-built AI apps, automations and internal tools — made by expert builders, priced for small businesses. Install in hours, not months.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GetForged — AI App Marketplace',
    description: 'Buy pre-built AI apps, automations and internal tools — made by expert builders, priced for small businesses. Install in hours, not months.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${bebasNeue.variable} ${fraunces.variable} ${dmMono.variable} ${montserrat.variable}`}
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
