import type { Config } from 'tailwindcss'

/*
  Mirrors the tokens in app/globals.css (:root) so Tailwind utilities and
  hand-written CSS resolve to the same values. Legacy names (ink, amber,
  slate, ghost…) are kept as aliases onto the new palette — a handful of
  components still use them as Tailwind classes, and remapping here means
  those render in the new language instead of the old dark theme.
  Source of truth: design-system/MASTER.md §2.
*/
const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        surface:   '#ffffff',
        surface2:  '#f7f7f7',
        surface3:  '#efeff0',
        inkPanel:  '#1c1f26',

        text:      '#222325',
        text2:     '#62646a',
        text3:     '#95979d',

        line:      '#e4e5e7',
        lineStrong:'#c5c6c9',

        amber:     '#e8920a',
        amberHover:'#cf8009',
        amberTint: '#fef6e7',
        amberInk:  '#8f5a06',
        star:      '#ffb33e',
        success:   '#1f8b5f',
        danger:    '#c2374a',
        info:      '#2f6fdb',

        // Legacy aliases
        ink:    '#222325',
        amber2: '#cf8009',
        rust:   '#c2374a',
        slate:  '#f7f7f7',
        mid:    '#efeff0',
        dim:    '#95979d',
        muted:  '#62646a',
        ghost:  '#62646a',
        paper:  '#f7f7f7',
        white:  '#ffffff',
      },
      fontFamily: {
        // Two real families; legacy keys alias onto them.
        sans:    ['var(--font-sans)', 'system-ui', 'sans-serif'],
        body:    ['var(--font-body)', 'system-ui', 'sans-serif'],
        display: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        ui:      ['var(--font-sans)', 'system-ui', 'sans-serif'],
        serif:   ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '4px',
        lg: '8px',
      },
      maxWidth: {
        container: '1400px',
      },
      boxShadow: {
        card:      '0 1px 2px rgba(0,0,0,0.04)',
        cardHover: '0 4px 14px rgba(0,0,0,0.10)',
        pop:       '0 8px 28px rgba(0,0,0,0.14)',
      },
    },
  },
  plugins: [],
}

export default config
