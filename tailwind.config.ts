import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@tremor/react/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    transparent: 'transparent',
    current: 'currentColor',
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      colors: {
        tremor: {
          brand: {
            faint: '#eff6ff',
            muted: '#bfdbfe',
            subtle: '#60a5fa',
            DEFAULT: '#3b82f6',
            emphasis: '#1d4ed8',
            inverted: '#ffffff',
          },
          background: {
            muted: '#f9fafb',
            subtle: '#f3f4f6',
            DEFAULT: '#ffffff',
            emphasis: '#374151',
          },
          border: {
            DEFAULT: '#e5e7eb',
          },
          ring: {
            DEFAULT: '#e5e7eb',
          },
          content: {
            subtle: '#9ca3af',
            DEFAULT: '#6b7280',
            emphasis: '#374151',
            strong: '#111827',
            inverted: '#ffffff',
          },
        },
        'dark-tremor': {
          brand: {
            faint: 'rgb(var(--primary-color) / 0.1)',
            muted: 'rgb(var(--primary-color) / 0.3)',
            subtle: 'rgb(var(--primary-color) / 0.6)',
            DEFAULT: 'rgb(var(--primary-color))',
            emphasis: 'rgb(var(--primary-color) / 1.2)',
            inverted: 'rgb(var(--background-end-rgb))',
          },
          background: {
            muted: 'rgb(var(--highlight-bg))',
            subtle: 'rgb(var(--background-start-rgb))',
            DEFAULT: 'rgb(var(--background-end-rgb))',
            emphasis: 'rgb(var(--foreground-rgb))',
          },
          border: {
            DEFAULT: 'rgb(var(--border-color))',
          },
          ring: {
            DEFAULT: 'rgb(var(--primary-color))',
          },
          content: {
            subtle: 'rgb(var(--foreground-rgb) / 0.6)',
            DEFAULT: 'rgb(var(--foreground-rgb) / 0.8)',
            emphasis: 'rgb(var(--foreground-rgb))',
            strong: 'rgb(var(--foreground-rgb))',
            inverted: 'rgb(var(--background-end-rgb))',
          },
        },
        'thematic-red': 'rgb(var(--secondary-color))',
        'thematic-gold': 'rgb(var(--primary-color))',
      },
      boxShadow: {
        'tremor-input': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'tremor-card': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'tremor-dropdown': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'dark-tremor-input': '0 1px 2px 0 rgb(var(--border-color) / 0.5)',
        'dark-tremor-card': '0 1px 3px 0 rgb(var(--border-color) / 0.7), 0 1px 2px -1px rgb(var(--border-color) / 0.7)',
        'dark-tremor-dropdown': '0 4px 6px -1px rgb(var(--border-color) / 0.7), 0 2px 4px -2px rgb(var(--border-color) / 0.7)',
      },
      borderRadius: {
        'tremor-small': '0.375rem',
        'tremor-default': '0.5rem',
        'tremor-full': '9999px',
      },
      fontSize: {
        'tremor-label': ['0.75rem', { lineHeight: '1rem' }],
        'tremor-default': ['0.875rem', { lineHeight: '1.25rem' }],
        'tremor-title': ['1.125rem', { lineHeight: '1.75rem' }],
        'tremor-metric': ['1.875rem', { lineHeight: '2.25rem' }],
      },
    },
  },
  safelist: [
    {
      pattern: /^(bg|text|border|ring)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-([0-9]+)$/,
    },
  ],
  plugins: [],
};
export default config;
