/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Font untuk Teks Biasa (Modern)
        sans: ['Inter', 'sans-serif'],
        // Font untuk Judul (Elegant/Mewah)
        serif: ['"Playfair Display"', 'serif'],

      quran: ['"Scheherazade New"', 'serif'],
      },
    },
  },
  plugins: [],
}