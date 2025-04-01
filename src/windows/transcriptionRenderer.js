const transcriptionOutput = document.getElementById('transcription-output')
const voiceAnimation = document.getElementById('voice-animation')

// Listen for transcription updates from the main process
window.electronAPI.onTranscriptionUpdate((text) => {
  // Event object is stripped by preload
  console.log('Renderer received text:', text) // Debug log
  if (transcriptionOutput && voiceAnimation) {
    transcriptionOutput.textContent = text || '...' // Display text or '...' if empty

    // Show animation only when listening/transcribing, hide for final result/error
    if (text === 'Listening...' || text === 'Transcribing...') {
      voiceAnimation.classList.add('active')
    } else {
      voiceAnimation.classList.remove('active')
    }
  } else {
    console.error(
      'Renderer could not find transcription output or animation element.'
    )
  }
})

// Optional: Listen for a signal to close the window (Main process closes directly now)
// window.electronAPI.onCloseWindow(() => { // Use the specific helper from preload
//   console.log('Renderer received close signal.');
//   window.close(); // Close the window when instructed
// });

// Initial state
if (transcriptionOutput && voiceAnimation) {
  transcriptionOutput.textContent = 'Initializing...'
  voiceAnimation.classList.remove('active') // Ensure animation is hidden initially
}
