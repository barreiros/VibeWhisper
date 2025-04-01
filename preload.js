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
    let validReceiveChannels = ['shortcut-registration-failed'] // Add more as needed
    if (validReceiveChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender` for security
      ipcRenderer.on(channel, (event, ...args) => func(...args))
    }
  },
  // Expose specific invoke/handle APIs
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setHotkey: (hotkey) => ipcRenderer.invoke('set-hotkey', hotkey),
  // Placeholder for setting model (using send for simplicity, could use invoke)
  setModel: (model) => ipcRenderer.send('set-model', model),
  // Placeholder for setting microphone (using send for simplicity, could use invoke)
  setMicrophone: (micId) => ipcRenderer.send('set-microphone', micId),
})

console.log('Preload script loaded.')
