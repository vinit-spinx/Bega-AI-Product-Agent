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
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
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
        'typing-dot':     'typing-dot 1.4s infinite ease-in-out',
        'fade-in':        'fade-in 0.35s ease-out both',
        'slide-up':       'slide-up 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        'slide-in-right': 'slide-in-right 0.35s ease-out both',
        'slide-in-left':  'slide-in-left 0.35s ease-out both',
        'scale-in':       'scale-in 0.3s ease-out both',
        'float':          'float 7s ease-in-out infinite',
        'draw':           'draw 1.4s ease-out both',
      },
      keyframes: {
        'typing-dot': {
          '0%, 80%, 100%': { transform: 'scale(0)', opacity: '0' },
          '40%':            { transform: 'scale(1)', opacity: '1' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          from: { transform: 'translateY(100%)' },
          to:   { transform: 'translateY(0)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(14px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-in-left': {
          from: { opacity: '0', transform: 'translateX(-14px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        'draw': {
          from: { strokeDashoffset: '1' },
          to:   { strokeDashoffset: '0' },
        },
      },
      backgroundImage: {
        'gradient-conic': 'conic-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

export default config;
