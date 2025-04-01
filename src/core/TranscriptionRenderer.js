const transcriptionOutput = document.getElementById('transcription-output')
const micIndicator = document.getElementById('mic-indicator')

// Listen for transcription updates from the main process
window.electronAPI.onTranscriptionUpdate((event, text) => {
  if (transcriptionOutput) {
    // Update text, handle potential empty strings after transcription
    transcriptionOutput.textContent = text ? text.trim() : 'Processing...'
  }
})

// Listen for recording state changes from the main process
window.electronAPI.onRecordingStateChange((event, isRecording) => {
  if (micIndicator) {
    if (isRecording) {
      micIndicator.classList.add('active')
      transcriptionOutput.textContent = 'Listening...' // Reset text when starting
    } else {
      micIndicator.classList.remove('active')
      // Optionally change text when stopped, or leave the last transcription
      // transcriptionOutput.textContent = 'Stopped.';
    }
  }
})

// Optional: Listen for a signal to close the window
window.electronAPI.onCloseTranscriptionWindow(() => {
  window.close() // Close the window when instructed
})

// Initial state message
if (transcriptionOutput) {
  transcriptionOutput.textContent = 'Ready' // More appropriate initial text
}
// Ensure the indicator starts in the non-active state visually
if (micIndicator) {
  micIndicator.classList.remove('active')
}
