import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:      '#F2F0EB',
        card:    '#FAFAF7',
        border:  '#D9D5CC',
        muted:   '#6B6760',
        an:      '#1A3A8F',
        senat:   '#B91C1C',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        body:    ['DM Sans', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
