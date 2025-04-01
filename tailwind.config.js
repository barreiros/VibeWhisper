/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './*.html', // Scan all HTML files in the root
    './*.js', // Scan all JS files in the root (includes renderer.js, transcriptionRenderer.js)
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
