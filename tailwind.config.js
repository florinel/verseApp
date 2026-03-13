/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Merriweather"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      colors: {
        parchment: {
          50: '#fdfcf9',
          100: '#f9f5ed',
          200: '#f3ebd8',
          300: '#e8d9b8',
          400: '#d4be8e',
          500: '#c4a76c',
        },
      },
    },
  },
  plugins: [],
}
