/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        retro: {
          beige: '#EAE4D8',
          green: '#5C6B28',
          rust: '#B85A38',
          blue: '#5B8287', 
          yellow: '#D9A05B',
          dark: '#23362D',
          orange: '#D97736',
          teal: '#3D8C8F',
          brown: '#A06B50',
          purple: '#7D5C77',
        }
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      }
    },
  },
  plugins: [],
}