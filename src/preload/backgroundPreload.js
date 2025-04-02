const { contextBridge, ipcRenderer } = require('electron')

console.log('[Preload] backgroundPreload.js: Script starting execution.') // <-- ADDED TOP LEVEL LOG

let mediaRecorder = null
let audioChunks = []
let audioStream = null
let audioContext = null // For volume analysis
let analyser = null
let source = null
let volumeDataArray = null
let volumeUpdateIntervalId = null
const VOLUME_UPDATE_INTERVAL = 100 // ms

// Function to start audio capture using Web Audio API
async function startCapture(deviceId = 'default') {
  console.log('[Preload] Attempting to start audio capture...')
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    console.warn('[Preload] Already recording.')
    return
  }

  try {
    // Get audio stream from the specified microphone
    const constraints = {
      audio: {
        deviceId: deviceId === 'default' ? undefined : { exact: deviceId },
        // Optional: Add noise suppression, echo cancellation if needed and supported
        // noiseSuppression: true,
        // echoCancellation: true
      },
      video: false,
    }
    audioStream = await navigator.mediaDevices.getUserMedia(constraints)
    console.log('[Preload] Got user media stream.')

    // --- Setup Volume Analyser ---
    if (!audioContext) {
      audioContext = new AudioContext()
    }
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 256 // Smaller FFT size for faster processing
    const bufferLength = analyser.frequencyBinCount
    volumeDataArray = new Uint8Array(bufferLength)

    // Connect the stream to the analyser
    source = audioContext.createMediaStreamSource(audioStream)
    source.connect(analyser)
    // Note: We don't connect analyser to destination as we only need analysis, not playback here.

    // Start sending volume updates
    if (volumeUpdateIntervalId) clearInterval(volumeUpdateIntervalId) // Clear previous interval if any
    volumeUpdateIntervalId = setInterval(
      sendVolumeUpdate,
      VOLUME_UPDATE_INTERVAL
    )
    console.log('[Preload] Volume analyser setup and update interval started.')
    // --- End Volume Analyser Setup ---

    // --- Media Recorder Setup ---
    // Determine supported MIME type (prefer opus or webm if available)
    const options = {}
    if (MediaRecorder.isTypeSupported('audio/opus;codecs=opus')) {
      options.mimeType = 'audio/opus;codecs=opus'
    } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      options.mimeType = 'audio/webm;codecs=opus'
    } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=pcm')) {
      options.mimeType = 'audio/webm;codecs=pcm' // Fallback
    } else if (MediaRecorder.isTypeSupported('audio/wav')) {
      options.mimeType = 'audio/wav' // Another fallback
    }
    // Add more fallbacks if necessary, e.g., 'audio/ogg;codecs=opus'

    console.log(`[Preload] Using MIME type: ${options.mimeType || 'default'}`)

    mediaRecorder = new MediaRecorder(audioStream, options)
    audioChunks = [] // Reset chunks array

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        console.log(`[Preload] Audio chunk available, size: ${event.data.size}`)
        audioChunks.push(event.data)
        // Send chunks incrementally if needed (e.g., for live transcription)
        // ipcRenderer.send('audio-chunk', event.data); // Requires main process handling
      }
    }

    mediaRecorder.onstop = async () => {
      console.log('[Preload] MediaRecorder stopped.')
      if (audioChunks.length > 0) {
        // Combine chunks into a single Blob
        const audioBlob = new Blob(audioChunks, {
          type: mediaRecorder.mimeType || 'audio/webm',
        }) // Use recorded mimeType
        console.log(
          `[Preload] Final audio blob created, size: ${audioBlob.size}, type: ${audioBlob.type}`
        )

        // Convert Blob to ArrayBuffer to send via IPC
        const arrayBuffer = await audioBlob.arrayBuffer()
        console.log(
          `[Preload] Converted blob to ArrayBuffer, size: ${arrayBuffer.byteLength}`
        )

        // Send the complete audio data to the main process
        console.log(
          `[Preload] Invoking audio-data-complete with buffer size: ${arrayBuffer.byteLength}`
        ) // DEBUG
        ipcRenderer.invoke('audio-data-complete', arrayBuffer, audioBlob.type) // Send buffer and type
      } else {
        console.warn(
          '[Preload] No audio chunks recorded. Invoking audio-data-complete with null.'
        ) // DEBUG
        ipcRenderer.invoke('audio-data-complete', null, null) // Indicate no data
      }

      // Clean up stream tracks
      // Clean up analyser and context
      if (volumeUpdateIntervalId) {
        clearInterval(volumeUpdateIntervalId)
        volumeUpdateIntervalId = null
        console.log('[Preload] Volume update interval stopped.')
      }
      if (source) {
        source.disconnect() // Disconnect analyser
        source = null
      }
      // Don't close audioContext here, might be reused

      // Clean up stream tracks
      if (audioStream) {
        audioStream.getTracks().forEach((track) => track.stop())
        console.log('[Preload] Audio stream tracks stopped.')
        audioStream = null
      }
      audioChunks = [] // Clear chunks
      mediaRecorder = null // Clear recorder instance
    }

    mediaRecorder.onerror = (event) => {
      console.error('[Preload] MediaRecorder error:', event.error)
      ipcRenderer.send('audio-error', event.error.name, event.error.message)
      // Clean up on error
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop()
      }
      // Clean up analyser on error too
      if (volumeUpdateIntervalId) clearInterval(volumeUpdateIntervalId)
      volumeUpdateIntervalId = null
      if (source) source.disconnect()
      source = null

      if (audioStream) {
        audioStream.getTracks().forEach((track) => track.stop())
        audioStream = null
      }
      mediaRecorder = null
      audioChunks = []
    }

    // Start recording
    mediaRecorder.start() // Collect data in default time slices or rely on stop()
    console.log('[Preload] MediaRecorder started.')
  } catch (err) {
    console.error('[Preload] Error accessing microphone:', err)
    // Send error details back to the main process
    ipcRenderer.send('audio-error', err.name, err.message)
    // Clean up any partial stream
    if (audioStream) {
      audioStream.getTracks().forEach((track) => track.stop())
      audioStream = null
    }
  }
}

// Function to stop audio capture
function stopCapture() {
  console.log('[Preload] Attempting to stop audio capture...')
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop() // This will trigger the 'onstop' event handler
  } else {
    console.warn('[Preload] Not recording or recorder not initialized.')
    // Ensure cleanup even if stop is called unexpectedly
    // Clean up analyser on unexpected stop too
    if (volumeUpdateIntervalId) clearInterval(volumeUpdateIntervalId)
    volumeUpdateIntervalId = null
    if (source) source.disconnect()
    source = null

    if (audioStream) {
      audioStream.getTracks().forEach((track) => track.stop())
      audioStream = null
    }
    mediaRecorder = null
    audioChunks = []
  }
}
// <-- EXTRA BRACE REMOVED

// Function to calculate and send volume updates
function sendVolumeUpdate() {
  if (!analyser || !volumeDataArray) return

  analyser.getByteFrequencyData(volumeDataArray)

  let sum = 0
  for (let i = 0; i < volumeDataArray.length; i++) {
    sum += volumeDataArray[i]
  }
  const average = sum / volumeDataArray.length

  // Normalize the average volume (0-255) to a 0-1 range
  // Apply a curve (e.g., sqrt) to make lower volumes more visible
  const normalizedVolume = Math.sqrt(Math.min(average / 128, 1.0)) // Adjust divisor (128) as needed

  // Send to main process
  // console.log(`[Preload] Sending volume update: ${normalizedVolume.toFixed(3)}`); // DEBUG
  ipcRenderer.send('audio-volume-update', normalizedVolume)
}

// Expose functions to the main process via contextBridge
contextBridge.exposeInMainWorld('audioUtils', {
  start: (deviceId) => ipcRenderer.invoke('start-audio-capture', deviceId),
  stop: () => ipcRenderer.invoke('stop-audio-capture'),
})

// Listen for commands from the main process
ipcRenderer.on('command-start-capture', (event, deviceId) => {
  startCapture(deviceId)
})

ipcRenderer.on('command-stop-capture', () => {
  stopCapture()
})

console.log('[Preload] Background preload script loaded.')
