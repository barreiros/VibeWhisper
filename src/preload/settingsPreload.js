const { contextBridge, ipcRenderer } = require('electron')

// Whitelist channels specifically for the Settings window
const validSendChannels = ['set-microphone'] // Channels renderer -> main
const validReceiveChannels = [
  'shortcut-registration-failed',
  'log-message',
  'api-key-invalid',
] // Channels main -> renderer
const validInvokeChannels = [
  'get-settings',
  'set-api-key',
  'set-hotkey',
  'get-usage-stats',
] // Channels renderer <-> main (request/response)

console.log('Settings Preload Script Loaded.')

contextBridge.exposeInMainWorld('electronAPI', {
  // Send (Renderer -> Main)
  send: (channel, data) => {
    if (validSendChannels.includes(channel)) {
      ipcRenderer.send(channel, data)
    } else {
      console.warn(
        `SettingsPreload: Ignored send on invalid channel: ${channel}`
      )
    }
  },
  // On (Main -> Renderer)
  on: (channel, func) => {
    if (validReceiveChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender`
      const subscription = (event, ...args) => func(...args)
      ipcRenderer.on(channel, subscription)
      // Return a cleanup function
      return () => {
        ipcRenderer.removeListener(channel, subscription)
        console.log(`SettingsPreload: Removed listener for channel: ${channel}`)
      }
    } else {
      console.warn(
        `SettingsPreload: Ignored listener registration for invalid channel: ${channel}`
      )
      return () => {} // Return dummy cleanup function
    }
  },
  // Invoke (Renderer <-> Main)
  invoke: (channel, ...args) => {
    if (validInvokeChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args)
    } else {
      console.warn(
        `SettingsPreload: Ignored invoke on invalid channel: ${channel}`
      )
      return Promise.reject(new Error(`Invalid invoke channel: ${channel}`))
    }
  },

  // --- Specific Helpers for Settings ---
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setApiKey: (apiKey) => ipcRenderer.invoke('set-api-key', apiKey),
  setHotkey: (hotkey) => ipcRenderer.invoke('set-hotkey', hotkey),
  setMicrophone: (micId) => ipcRenderer.send('set-microphone', micId), // Using send as it's one-way
  getUsageStats: () => ipcRenderer.invoke('get-usage-stats'),

  // Listener for log messages
  onLogMessage: (callback) => {
    const subscription = (event, ...args) => callback(...args)
    ipcRenderer.on('log-message', subscription)
    return () => ipcRenderer.removeListener('log-message', subscription)
  },
  // Listener for shortcut registration failures
  onShortcutRegistrationFailed: (callback) => {
    const subscription = (event, ...args) => callback(...args)
    ipcRenderer.on('shortcut-registration-failed', subscription)
    return () =>
      ipcRenderer.removeListener('shortcut-registration-failed', subscription)
  },
  // Listener for API key validation failures
  onApiKeyInvalid: (callback) => {
    const subscription = (event, ...args) => callback(...args)
    ipcRenderer.on('api-key-invalid', subscription)
    return () => ipcRenderer.removeListener('api-key-invalid', subscription)
  },
})
