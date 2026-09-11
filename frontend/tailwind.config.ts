import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: 'var(--ink)',
        white: '#FFFFFF',
        canvas: 'var(--canvas)',
        subtle: 'var(--subtle)',
        border: 'var(--border)',
        muted: 'var(--muted)',
        teal: 'var(--teal)',
        'teal-dark': 'var(--teal-dark)',
        'teal-soft': 'var(--teal-soft)',
        coral: 'var(--coral)',
        amber: 'var(--amber)',
        // Compatibility aliases for existing pages
        paper: 'var(--surface)',
        surface: 'var(--surface)',
        mist: 'var(--subtle)',
        ivory: 'var(--canvas)',
        sage: 'var(--sage)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        display: ['2.5rem', { lineHeight: '1.12', letterSpacing: '-0.02em' }],
        h1: ['2rem', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        h2: ['1.5rem', { lineHeight: '1.25', letterSpacing: '-0.015em' }],
        h3: ['1.125rem', { lineHeight: '1.35' }],
        'body-lg': ['1.0625rem', { lineHeight: '1.55' }],
        body: ['1rem', { lineHeight: '1.55' }],
        small: ['0.875rem', { lineHeight: '1.5' }],
        caption: ['0.75rem', { lineHeight: '1.4' }],
      },
      spacing: {
        18: '4.5rem',
        22: '5.5rem',
      },
      borderRadius: {
        control: '0.625rem',
        card: '0.75rem',
      },
      maxWidth: {
        shell: '90rem',
        prose: '40rem',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(var(--shadow-ink), 0.04), 0 4px 12px rgba(var(--shadow-ink), 0.04)',
        lift: '0 4px 16px rgba(var(--shadow-ink), 0.08)',
        menu: '0 8px 24px rgba(var(--shadow-ink), 0.1)',
        nav: '0 1px 0 rgba(var(--shadow-ink), 0.06)',
      },
      transitionDuration: {
        fast: '160ms',
        med: '200ms',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        fadeUp: 'fadeUp 0.2s ease-out both',
        fadeIn: 'fadeIn 0.16s ease-out both',
        pulseSoft: 'pulseSoft 1.3s ease-in-out infinite',
        scaleIn: 'scaleIn 0.16s ease-out both',
      },
    },
  },
  plugins: [],
};
export default config;
