import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink:    '#0c0b09',
        amber:  '#e8920a',
        amber2: '#f5a623',
        rust:   '#b83a1a',
        slate:  '#1a1c24',
        mid:    '#2a2d38',
        dim:    '#3e4150',
        muted:  '#7a7670',
        ghost:  '#b8b0a4',
        paper:  '#f0ebe2',
        white:  '#f8f4ee',
      },
      fontFamily: {
        display: ['var(--font-bebas)', 'sans-serif'],
        serif:   ['var(--font-serif)', 'serif'],
        mono:    ['var(--font-mono)', 'monospace'],
        ui:      ['var(--font-syne)', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
