import type { Metadata } from 'next'
import { Bebas_Neue, Instrument_Serif, DM_Mono, Syne } from 'next/font/google'
import './globals.css'

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
  display: 'swap',
})

const instrumentSerif = Instrument_Serif({
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
})

const dmMono = DM_Mono({
  weight: ['300', '400', '500'],
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'GetForged — AI App Marketplace',
    template: '%s | GetForged',
  },
  description:
    'AI-built apps, automations & websites — made by Claude Code & Cursor experts, priced for small businesses. No agencies. No six-figure dev budgets.',
  metadataBase: new URL('https://getforged.io'),
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: 'https://getforged.io',
    siteName: 'GetForged',
    title: 'GetForged — AI App Marketplace',
    description: 'Built by builders. Made for business.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GetForged — AI App Marketplace',
    description: 'Built by builders. Made for business.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${bebasNeue.variable} ${instrumentSerif.variable} ${dmMono.variable} ${syne.variable}`}
    >
      <body>{children}</body>
    </html>
  )
}
