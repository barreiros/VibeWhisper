// const transcriptionOutput = document.getElementById('transcription-output') // Removed, element no longer exists
const micIndicator = document.getElementById('mic-indicator')

// Listen for transcription updates from the main process
window.electronAPI.onTranscriptionUpdate((event, text) => {
  // No text element to update anymore
  // console.log('Transcription update received:', text); // Optional: Keep for debugging if needed
})

// Listen for recording state changes from the main process
window.electronAPI.onRecordingStateChange((event, isRecording) => {
  if (micIndicator) {
    if (isRecording) {
      micIndicator.classList.add('active')
      // transcriptionOutput.textContent = 'Listening...' // Removed
    } else {
      micIndicator.classList.remove('active')
      // transcriptionOutput.textContent = 'Stopped.'; // Removed
    }
  }
})

// Optional: Listen for a signal to close the window
window.electronAPI.onCloseWindow(() => {
  // <-- Corrected function name
  window.close() // Close the window when instructed
})

// Initial state message - Removed as there's no text element
// if (transcriptionOutput) {
//   transcriptionOutput.textContent = 'Ready'
// }
// Ensure the indicator starts in the non-active state visually
if (micIndicator) {
  micIndicator.classList.remove('active')
}
