const { ipcMain } = require('electron')
// SettingsStore instance is now passed in constructor

class IpcHandler {
  constructor(settingsStore) {
    // Accept settingsStore instance
    // References to other managers will be set via setManagers
    this.settingsStore = settingsStore // Store the instance
    this.appManager = null
    this.hotkeyManager = null
    this.windowManager = null
    // Add references for AudioRecorder, TranscriptionService etc. later
    this.audioRecorder = null // Placeholder
    console.log('IpcHandler initialized.')
  }

  setManagers(managers) {
    this.appManager = managers.appManager
    this.hotkeyManager = managers.hotkeyManager
    this.windowManager = managers.windowManager
    this.audioRecorder = managers.audioRecorder // Assuming it will be passed
    console.log('IpcHandler: Managers set.')
  }

  initialize() {
    this.registerHandlers()
    console.log('IpcHandler: Handlers registered.')
  }

  registerHandlers() {
    // Handle request from renderer to get current settings
    ipcMain.handle('get-settings', async (event) => {
      console.log('IPC: Received get-settings request.')
      // Use the passed instance
      return this.settingsStore.getAll() // Use method from SettingsStore
    })

    // Handle request from renderer to set a new API key
    ipcMain.handle('set-api-key', async (event, newApiKey) => {
      console.log('IPC: Received set-api-key request.')
      try {
        // Use the passed instance
        this.settingsStore.set('apiKey', newApiKey)
        console.log('IPC: API Key saved. Re-initializing OpenAI client...')
        // Trigger re-initialization in AppManager (or a dedicated service)
        const initialized = this.appManager?.reinitializeOpenAIClient()
        if (!initialized) {
          console.error(
            'IPC: Failed to re-initialize OpenAI client with the new key.'
          )
          // Optionally notify renderer if initialization failed
          this.windowManager?.sendToSettingsWindow('api-key-invalid')
          return {
            success: false,
            error: 'Failed to initialize OpenAI client with new key.',
          }
        }
        return { success: true }
      } catch (error) {
        console.error('IPC: Error saving API key:', error)
        return { success: false, error: error.message }
      }
    })

    // Handle request from renderer to set a new hotkey
    ipcMain.handle('set-hotkey', async (event, newHotkey) => {
      console.log(`IPC: Received set-hotkey request: ${newHotkey}`)
      try {
        // Use the passed instance
        this.settingsStore.set('hotkey', newHotkey)
        // Re-register with the new hotkey via HotkeyManager
        const success = this.hotkeyManager?.registerCurrentHotkey()
        if (!success) {
          // Notify renderer if registration failed
          this.windowManager?.sendToSettingsWindow(
            'shortcut-registration-failed',
            newHotkey
          )
        }
        return { success: success ?? false } // Return success status from registration
      } catch (error) {
        console.error('IPC: Error setting hotkey:', error)
        // Attempt to re-register the old hotkey if setting the new one failed badly?
        // Maybe not, let the user know it failed.
        this.hotkeyManager?.registerCurrentHotkey() // Try to restore previous
        return { success: false, error: error.message }
      }
    })

    // Handle request for usage stats
    ipcMain.handle('get-usage-stats', async (event) => {
      console.log('IPC: Received get-usage-stats request.')
      // Use the passed instance
      const totalSeconds = this.settingsStore.getTotalDurationSeconds()
      const totalMinutes = totalSeconds / 60
      const costPerMinute = 0.006 // OpenAI Whisper cost per minute in USD
      const estimatedCost = totalMinutes * costPerMinute
      return {
        totalSeconds: totalSeconds,
        estimatedCost: estimatedCost,
      }
    })

    // Handle request from renderer to set the microphone
    ipcMain.on('set-microphone', (event, micId) => {
      console.log(`IPC: Received set-microphone request: ${micId}`)
      // Use the passed instance
      this.settingsStore.set('microphone', micId)
      // TODO: Add logic here if the audio input stream needs to be changed immediately
      // This might involve notifying the AudioRecorder service/manager
      // this.audioRecorder?.setDevice(micId);
    })

    // Handle manual start/stop requests from renderer (delegated to AudioRecorder)
    ipcMain.on('start-recording', () => {
      console.log('IPC: Received start-recording request from renderer.')
      // Delegate to the main toggle logic (which might be in AppManager or AudioRecorder)
      this.hotkeyManager?.toggleCallback() // Simulate hotkey press? Or call recorder directly?
      // Or: this.audioRecorder?.startRecording();
    })

    ipcMain.on('stop-recording', () => {
      console.log('IPC: Received stop-recording request from renderer.')
      // Delegate to the main toggle logic
      this.hotkeyManager?.toggleCallback()
      // Or: this.audioRecorder?.stopRecordingAndTranscribe();
    })

    // --- Log Redirection ---
    // Redirect console logs from main process to the settings window
    const originalConsoleLog = console.log
    const originalConsoleWarn = console.warn
    const originalConsoleError = console.error

    console.log = (...args) => {
      originalConsoleLog.apply(console, args) // Keep logging to main process console
      this.windowManager?.logToSettingsWindow('log', ...args)
    }
    console.warn = (...args) => {
      originalConsoleWarn.apply(console, args)
      this.windowManager?.logToSettingsWindow('warn', ...args)
    }
    console.error = (...args) => {
      originalConsoleError.apply(console, args)
      this.windowManager?.logToSettingsWindow('error', ...args)
    }
    console.log('IPC: Console methods redirected to settings window.')
    // --- End Log Redirection ---
  }
}

module.exports = IpcHandler
