/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/window/**/*.html', // Scan HTML files in src/window
    './src/core/Renderer.js', // Updated path to core
    './src/core/TranscriptionRenderer.js', // Updated path to core
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
