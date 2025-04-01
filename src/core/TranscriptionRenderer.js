const transcriptionOutput = document.getElementById('transcription-output')

// Listen for transcription updates from the main process
window.electronAPI.onTranscriptionUpdate((event, text) => {
  if (transcriptionOutput) {
    transcriptionOutput.textContent = text || '...' // Display text or '...' if empty
  }
})

// Optional: Listen for a signal to close the window
window.electronAPI.onCloseTranscriptionWindow(() => {
  window.close() // Close the window when instructed
})

// Initial message
if (transcriptionOutput) {
  transcriptionOutput.textContent = 'Initializing...'
}
