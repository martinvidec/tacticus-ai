import type { Config } from "tailwindcss";
// Importiere die Standardfarben
const colors = require('tailwindcss/colors'); // <-- HINZUFÜGEN

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@tremor/react/**/*.{js,ts,jsx,tsx}", // Ensure this path is correct
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
        // Füge die Standardfarben HIER hinzu
        ...colors, // <-- HINZUFÜGEN (Stellt sicher, dass slate, gray, emerald, etc. verfügbar sind)
        tremor: {
          brand: {
            faint: '#eff6ff', // Light mode blue
            muted: '#bfdbfe',
            subtle: '#60a5fa',
            DEFAULT: '#3b82f6',
            emphasis: '#1d4ed8',
            inverted: '#ffffff',
          },
          background: {
            muted: '#f9fafb', // Light mode gray
            subtle: '#f3f4f6',
            DEFAULT: '#ffffff',
            emphasis: '#374151',
          },
          border: {
            DEFAULT: '#e5e7eb', // Light mode gray
          },
          ring: {
            DEFAULT: '#e5e7eb', // Light mode gray
          },
          content: {
            subtle: '#9ca3af', // Light mode gray
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
            emphasis: 'rgb(var(--primary-color) / 1.2)', // Consider alpha > 1 carefully
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
            DEFAULT: 'rgb(var(--primary-color))', // Ring color in dark mode
          },
          content: {
            subtle: 'rgb(var(--foreground-rgb) / 0.6)',
            DEFAULT: 'rgb(var(--foreground-rgb) / 0.8)',
            emphasis: 'rgb(var(--foreground-rgb))',
            strong: 'rgb(var(--foreground-rgb))', // Ensure strong is distinct if needed
            inverted: 'rgb(var(--background-end-rgb))', // Color for text on brand backgrounds
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
      pattern: /^(bg|fill|text|border|ring)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-([0-9]+)$/,
      variants: ['hover', 'ui-selected'], // Add variants used by Tremor/Headless UI
    },
    {
      pattern: /^(text|border|ring)-(white|black|transparent)$/,
      variants: ['hover', 'ui-selected'],
    },
    'bg-emerald-500', 'fill-emerald-500', 'text-emerald-500',
    'bg-blue-500', 'fill-blue-500', 'text-blue-500',
    'bg-red-500', 'fill-red-500', 'text-red-500',
    'bg-purple-500', 'fill-purple-500', 'text-purple-500',
    'bg-amber-500', 'fill-amber-500', 'text-amber-500', // Needed for 'Total Power' line color if re-added
  ],
  plugins: [
    require('@headlessui/tailwindcss'), // Assuming you might use Headless UI based on variants added
    // require('@tailwindcss/forms'), // Uncomment if you use this plugin
  ],
};
export default config;
