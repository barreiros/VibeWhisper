const { contextBridge, ipcRenderer } = require('electron')

// Whitelist channels specifically for the Transcription window
const validReceiveChannels = [
  'transcription-update',
  'close-transcription-window',
  'recording-state-change', // Added channel for recording status
  'audio-volume-update', // Added channel for volume level
] // Channels main -> renderer

console.log('Transcription Preload Script Loaded.')

contextBridge.exposeInMainWorld('electronAPI', {
  // On (Main -> Renderer)
  on: (channel, func) => {
    if (validReceiveChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender`
      const subscription = (event, ...args) => func(...args)
      ipcRenderer.on(channel, subscription)
      // Return a cleanup function
      return () => {
        ipcRenderer.removeListener(channel, subscription)
        console.log(
          `TranscriptionPreload: Removed listener for channel: ${channel}`
        )
      }
    } else {
      console.warn(
        `TranscriptionPreload: Ignored listener registration for invalid channel: ${channel}`
      )
      return () => {} // Return dummy cleanup function
    }
  },

  // --- Specific Helpers for Transcription Window ---
  onTranscriptionUpdate: (callback) => {
    const subscription = (event, ...args) => callback(...args)
    ipcRenderer.on('transcription-update', subscription)
    return () =>
      ipcRenderer.removeListener('transcription-update', subscription)
  },
  onCloseWindow: (callback) => {
    // Note: Main process currently closes window directly, but this listener could be used
    // if main process sent a 'close-request' message first.
    const subscription = (event, ...args) => callback(...args)
    ipcRenderer.on('close-transcription-window', subscription)
    return () =>
      ipcRenderer.removeListener('close-transcription-window', subscription)
  },
  onRecordingStateChange: (callback) => {
    const subscription = (event, ...args) => callback(...args)
    ipcRenderer.on('recording-state-change', subscription)
    return () =>
      ipcRenderer.removeListener('recording-state-change', subscription)
  },
  onAudioVolumeUpdate: (callback) => {
    const subscription = (event, ...args) => callback(...args)
    ipcRenderer.on('audio-volume-update', subscription)
    return () => ipcRenderer.removeListener('audio-volume-update', subscription)
  },

  // --- Send (Renderer -> Main) ---
  requestStopRecording: () => {
    console.log('TranscriptionPreload: Sending stop-recording-request')
    ipcRenderer.send('stop-recording-request')
  },
})
