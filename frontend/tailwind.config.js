/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e8f0fe',
          100: '#d0e1fc',
          200: '#a1c3f9',
          300: '#72a5f6',
          400: '#4387f3',
          500: '#1b59b7',
          600: '#164a9a',
          700: '#113b7d',
          800: '#072370',
          900: '#041856',
        },
        accent: {
          50: '#edf7fc',
          100: '#d5edf8',
          200: '#a8daf1',
          300: '#7ac7ea',
          400: '#5cb5e3',
          500: '#3f93d3',
          600: '#3379b0',
          700: '#275f8d',
        },
        earth: {
          50: '#edf2f7',
          100: '#d6e3ed',
          200: '#b3c9db',
          300: '#8fafc9',
          400: '#6b95b7',
          500: '#4a7a9e',
        },
        sand: {
          50: '#f0f5fa',
          100: '#dce6f0',
          200: '#c4d4e3',
          300: '#a8bfd3',
          400: '#8caac3',
          500: '#7095b3',
        },
      },
      fontFamily: {
        sans: ['Roboto', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['Roboto', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
