// Import the CubeVisualizer class from its new file
import CubeVisualizer from './CubeVisualizer.js'

console.log('TranscriptionRenderer.js loaded')

let visualizer = null

// Initialize the visualizer directly now that import is static
// (Assuming this script is loaded via <script defer> or after the canvas element)
const canvas = document.getElementById('scene-canvas')
if (canvas) {
  visualizer = new CubeVisualizer(canvas)
} else {
  // Might need to wait for DOMContentLoaded if script is loaded early
  document.addEventListener('DOMContentLoaded', () => {
    const canvasOnLoad = document.getElementById('scene-canvas')
    if (canvasOnLoad) {
      visualizer = new CubeVisualizer(canvasOnLoad)
    } else {
      console.error(
        'Canvas element #scene-canvas still not found on DOMContentLoaded!'
      )
    }
  })
  console.error('Canvas element #scene-canvas not found initially!')
}

// --- Keep Existing IPC Listeners ---

// Listen for transcription updates (no visual element to update now)
window.electronAPI.onTranscriptionUpdate((event, text) => {
  // console.log('Transcription update received:', text); // Optional: Keep for debugging
})

// Listen for recording state changes
// Now calls a method on the visualizer instance
window.electronAPI.onRecordingStateChange((event, isRecording) => {
  console.log('Recording state changed IPC received:', isRecording) // Optional: Keep for debugging
  if (visualizer) {
    visualizer.setRecordingState(isRecording)
  }
})

// Listen for a signal to close the window
window.electronAPI.onCloseWindow(() => {
  window.close() // Close the window when instructed
})

// Listen for audio volume updates
window.electronAPI.onAudioVolumeUpdate((volume) => {
  // console.log(`Renderer: Volume update received: ${volume.toFixed(3)}`); // DEBUG
  if (visualizer) {
    visualizer.updateVolume(volume) // Pass volume to the visualizer
  }
})
