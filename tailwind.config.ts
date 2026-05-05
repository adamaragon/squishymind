import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: '#0a0b16', soft: '#0f1124' },
        accent: {
          violet: '#8b5cf6',
          cyan: '#06b6d4',
          pink: '#ec4899',
          amber: '#f59e0b',
          green: '#10b981',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
