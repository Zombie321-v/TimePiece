/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./main.js",
  ],
  theme: {
    extend: {
      colors: {
        luxury: {
          black: '#030303',
          dark: '#080808',
          card: 'rgba(10, 10, 10, 0.6)',
          gray: '#8a8a8a',
          silver: '#e5e5e5',
          gold: '#c5a880',
        }
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"Montserrat"', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['"Share Tech Mono"', 'monospace'],
      },
      letterSpacing: {
        widest: '0.25em',
        luxury: '0.4em',
      }
    },
  },
  plugins: [],
}
