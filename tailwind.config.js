/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'hako-bg': '#1a1b26',
        'hako-accent': '#7aa2f7',
        'hako-secondary': '#24283b',
      },
    },
  },
  plugins: [],
}

