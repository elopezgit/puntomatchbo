/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0A0A0A',
          800: '#121212',
          700: '#1E1E1E',
          600: '#2A2A2A'
        },
        primary: {
          500: '#bdfb32', // Neon green for Padel
          600: '#9edb22',
        },
        accent: {
          500: '#00f0ff', // Cyan neon
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
