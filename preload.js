const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Example: Allow sending messages from renderer to main
  // Allow sending specific messages from renderer to main
  send: (channel, data) => {
    // Whitelist channels for sending
    let validSendChannels = ['set-model', 'set-microphone'] // Add more as needed
    if (validSendChannels.includes(channel)) {
      ipcRenderer.send(channel, data)
    }
  },
  // Allow receiving specific messages from main to renderer
  on: (channel, func) => {
    // Whitelist channels for receiving
    let validReceiveChannels = [
      'shortcut-registration-failed',
      'log-message',
      'transcription-update', // Added for transcription window
      'close-transcription-window', // Added for transcription window
    ]
    if (validReceiveChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender` for security
      ipcRenderer.on(channel, (event, ...args) => func(...args))
    }
  },
  // Expose specific invoke/handle APIs
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setHotkey: (hotkey) => ipcRenderer.invoke('set-hotkey', hotkey),
  setApiKey: (apiKey) => ipcRenderer.invoke('set-api-key', apiKey), // Added for API Key
  // Placeholder for setting model (using send for simplicity, could use invoke) - REMOVED
  // setModel: (model) => ipcRenderer.send('set-model', model),
  // Placeholder for setting microphone (using send for simplicity, could use invoke)
  setMicrophone: (micId) => ipcRenderer.send('set-microphone', micId),
  // Add functions for manual start/stop
  startRecording: () => ipcRenderer.send('start-recording'),
  stopRecording: () => ipcRenderer.send('stop-recording'),
  // Add function to get usage stats
  getUsageStats: () => ipcRenderer.invoke('get-usage-stats'),

  // Specific listeners for the transcription window
  onTranscriptionUpdate: (callback) =>
    ipcRenderer.on('transcription-update', (event, ...args) =>
      callback(...args)
    ),
  onCloseTranscriptionWindow: (callback) =>
    ipcRenderer.on('close-transcription-window', (event, ...args) =>
      callback(...args)
    ),
})

console.log('Preload script loaded.')
