/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          500: '#0284c7',
          600: '#0369a1',
          700: '#075985',
          800: '#0c4a6e',
          900: '#082f49'
        },
        verdict: {
          verified: '#10b981',
          false: '#ef4444',
          misleading: '#f59e0b',
          partially: '#eab308',
          unverified: '#6b7280'
        }
      }
    }
  },
  plugins: []
};
