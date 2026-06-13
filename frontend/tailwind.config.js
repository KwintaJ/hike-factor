/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'retro-beige': '#EAE4D8',
        'retro-dark': '#23362D',
        
        'retro-green': {
          DEFAULT: '#5C6B28',
          dark: '#3A4519',
        },
        'retro-rust': {
          DEFAULT: '#B85A38',
          dark: '#7A3C25',
        },
        'retro-blue': {
          DEFAULT: '#5B8287',
          dark: '#3D5659',
        },
        'retro-yellow': {
          DEFAULT: '#D9A05B',
          dark: '#966D3E',
        },
        'retro-orange': {
          DEFAULT: '#D97736',
          dark: '#914F24',
        },
        'retro-teal': {
          DEFAULT: '#3D8C8F',
          dark: '#285C5E',
        },
        'retro-brown': {
          DEFAULT: '#A06B50',
          dark: '#6B4735',
        },
        'retro-purple': {
          DEFAULT: '#7D5C77',
          dark: '#533D4F',
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      }
    },
  },
  plugins: [],
}