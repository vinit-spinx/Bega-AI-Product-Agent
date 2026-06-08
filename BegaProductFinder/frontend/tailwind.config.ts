import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bega: {
          // Core
          black:  '#1A1A1A',
          white:  '#FFFFFF',
          // Backgrounds (warm white scale)
          'bg-0': '#FFFFFF',
          'bg-1': '#F7F5F2',
          'bg-2': '#EDEBE7',
          'bg-3': '#E2DFD9',
          // Text
          'text-1': '#1A1A1A',
          'text-2': '#5A5750',
          'text-3': '#9A9590',
          // Borders (warm gray)
          'border-1': '#E8E5E0',
          'border-2': '#D5D2CC',
          'border-3': '#BFBBB5',
          // Brand accent — warm architectural black
          
          // Semantic
          success: '#2D6A4F',
          error:   '#B91C1C',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        card:        '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-hover':'0 4px 12px 0 rgb(0 0 0 / 0.09), 0 2px 4px -1px rgb(0 0 0 / 0.06)',
        drawer:      '0 -4px 32px 0 rgb(0 0 0 / 0.12)',
        button:      '0 1px 2px 0 rgb(0 0 0 / 0.07)',
      },
      animation: {
        'typing-dot': 'typing-dot 1.4s infinite ease-in-out',
        'fade-in':    'fade-in 0.2s ease-out',
        'slide-up':   'slide-up 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
      },
      keyframes: {
        'typing-dot': {
          '0%, 80%, 100%': { transform: 'scale(0)', opacity: '0' },
          '40%':            { transform: 'scale(1)', opacity: '1' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          from: { transform: 'translateY(100%)' },
          to:   { transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

export default config;
