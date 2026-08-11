/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
        },
        ink: {
          900: '#0b1120',
          800: '#111827',
          700: '#1c2434',
        },
      },
    },
  },
  plugins: [],
};
