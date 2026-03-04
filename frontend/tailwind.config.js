/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#1e3a5f',
          600: '#1a3350',
          700: '#152b44',
          800: '#0f1f33',
          900: '#0a1628',
        },
        sand: {
          50: '#fdf8f0',
          100: '#f5ead6',
          200: '#ecdcb8',
          300: '#dcc5a0',
          400: '#c4a876',
          500: '#b8975e',
        },
        earth: {
          50: '#f5f5f0',
          100: '#e8e6dc',
          200: '#d4d0c0',
          300: '#b5ad98',
          400: '#968b72',
          500: '#7a6e56',
        },
        accent: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#2d7a4f',
          600: '#246340',
        },
      },
      fontFamily: {
        sans: ['"Source Sans 3"', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['"Merriweather"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
