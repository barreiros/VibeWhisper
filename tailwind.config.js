/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/window/**/*.html', // Scan HTML files in src/window
    './src/main/renderer.js', // Scan the moved renderer script
    './transcriptionRenderer.js', // Scan the transcription renderer script (still in root)
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
