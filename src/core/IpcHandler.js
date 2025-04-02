import { ipcMain, systemPreferences } from 'electron' // <-- Import systemPreferences
// SettingsStore instance is now passed in constructor

export default class IpcHandler {
  // Use export default
  constructor(settingsStore) {
    // Accept settingsStore instance
    // References to other managers will be set via setManagers
    this.settingsStore = settingsStore // Store the instance
    this.appManager = null
    this.hotkeyManager = null
    this.windowManager = null
    this.audioRecorder = null // Will be refactored/removed or repurposed
    this.transcriptionService = null // Add reference for TranscriptionService
    console.log('IpcHandler initialized.')
  }

  setManagers(managers) {
    this.appManager = managers.appManager
    this.hotkeyManager = managers.hotkeyManager
    this.windowManager = managers.windowManager
    this.audioRecorder = managers.audioRecorder // Keep for now, might call methods on it
    this.transcriptionService = managers.transcriptionService // Get TranscriptionService reference
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

    // Handle request from renderer to set the input language
    ipcMain.handle('set-language', async (event, languageCode) => {
      console.log(`IPC: Received set-language request: ${languageCode}`)
      try {
        // Use the passed instance
        this.settingsStore.set('language', languageCode)
        console.log(`IPC: Input language saved: ${languageCode}`)
        // No immediate action needed in other managers for language change
        return { success: true }
      } catch (error) {
        console.error('IPC: Error saving language setting:', error)
        return { success: false, error: error.message }
      }
    })

    // Handle request from renderer to set the transcription prompt
    ipcMain.handle('set-transcription-prompt', async (event, prompt) => {
      console.log(`IPC: Received set-transcription-prompt request: "${prompt}"`)
      try {
        // Use the passed instance
        this.settingsStore.set('transcriptionPrompt', prompt)
        console.log(`IPC: Transcription prompt saved: "${prompt}"`)
        return { success: true }
      } catch (error) {
        console.error('IPC: Error saving transcription prompt:', error)
        return { success: false, error: error.message }
      }
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

    // Handle request from transcription window (cube click) to stop recording
    ipcMain.on('stop-recording-request', () => {
      console.log(
        'IPC: Received stop-recording-request from transcription window.'
      )
      // Directly call the stop method on the recorder
      this.audioRecorder?.stopRecordingAndTranscribe() // Keep this for now, might change later
    })

    // --- Web Audio API IPC Handlers ---

    // Handle request from main process (e.g., triggered by hotkey) to start capture
    ipcMain.handle('start-audio-capture', async (event, deviceId) => {
      console.log(
        `IPC: Received start-audio-capture request for device: ${deviceId}`
      )
      // Send command to the background window's preload script
      this.windowManager?.sendToBackgroundWindow(
        'command-start-capture',
        deviceId
      )
      // We might need a way to confirm success/failure back from preload if necessary
      return { success: true } // Assume success for now
    })

    // Handle request from main process to stop capture
    ipcMain.handle('stop-audio-capture', async (event) => {
      console.log('IPC: Received stop-audio-capture request.')
      // Send command to the background window's preload script
      this.windowManager?.sendToBackgroundWindow('command-stop-capture')
      return { success: true } // Assume success for now
    })

    // Handle the complete audio data sent FROM the background preload script
    ipcMain.handle(
      'audio-data-complete',
      async (event, arrayBuffer, mimeType) => {
        console.log(
          // DEBUG: Log reception in main process
          `IPC: Handling audio-data-complete. MimeType: ${mimeType}, Buffer size: ${
            arrayBuffer?.byteLength ?? 0
          }`
        )
        if (arrayBuffer && this.transcriptionService) {
          try {
            // Convert ArrayBuffer back to Buffer for OpenAI client (or handle directly if possible)
            const audioBuffer = Buffer.from(arrayBuffer)
            console.log(
              `IPC: Converted ArrayBuffer to Buffer, size: ${audioBuffer.length}`
            )

            // Pass the buffer and mimeType to the transcription service
            // We need a new method in TranscriptionService to handle buffer input
            await this.transcriptionService.transcribeAudioBuffer(
              audioBuffer,
              mimeType
            )
            return { success: true }
          } catch (error) {
            console.error('IPC: Error processing completed audio data:', error)
            return { success: false, error: error.message }
          }
        } else if (!arrayBuffer) {
          console.warn(
            'IPC: Received null audio data, likely no chunks recorded.'
          )
          // Don't close window here anymore
          // this.windowManager?.closeTranscriptionWindow()
          return { success: true, message: 'No audio data recorded.' }
        } else {
          console.error(
            'IPC: TranscriptionService not available to handle audio data.'
          )
          return {
            success: false,
            error: 'TranscriptionService not available.',
          }
        }
      }
    )

    // Listen for errors sent FROM the background preload script
    ipcMain.on('audio-error', (event, errorName, errorMessage) => {
      console.error(
        `IPC: Received audio-error from preload: ${errorName} - ${errorMessage}`
      )
      // Potentially show an error to the user or update UI state
      // For example, ensure the transcription window is closed if an error occurs
      this.windowManager?.sendToTranscriptionWindow(
        'transcription-update',
        `Error: ${errorMessage}`
      )
      // Don't close window on error here anymore, let TranscriptionService handle UI
      // setTimeout(() => this.windowManager?.closeTranscriptionWindow(), 1500)
    })

    // Listen for volume updates sent FROM the background preload script
    ipcMain.on('audio-volume-update', (event, volume) => {
      // console.log(`IPC: Received audio-volume-update: ${volume.toFixed(3)}`); // DEBUG
      // Forward the volume update to the transcription window
      this.windowManager?.sendToTranscriptionWindow(
        'audio-volume-update',
        volume
      )
    })

    // --- Accessibility Check IPC Handler (macOS only) ---
    ipcMain.handle('check-accessibility', async () => {
      if (process.platform !== 'darwin') {
        return { supported: false, enabled: false } // Not applicable on non-macOS
      }
      try {
        // Pass false here so it *only* checks, doesn't prompt automatically
        const enabled = systemPreferences.isTrustedAccessibilityClient(false)
        console.log(`IPC: Accessibility check requested. Status: ${enabled}`)
        return { supported: true, enabled: enabled }
      } catch (error) {
        console.error('IPC: Error checking accessibility:', error)
        return { supported: true, enabled: false, error: error.message }
      }
    })

    ipcMain.handle('request-accessibility', async () => {
      if (process.platform !== 'darwin') {
        return { supported: false, enabled: false } // Not applicable
      }
      try {
        // Pass true here to *prompt* the user if not already enabled
        const enabledBeforePrompt =
          systemPreferences.isTrustedAccessibilityClient(true)
        console.log(
          `IPC: Accessibility request triggered. Status before prompt (if shown): ${enabledBeforePrompt}`
        )
        // We return the status *before* prompting, as the API doesn't wait.
        // The user needs to grant access via the OS dialog.
        return { supported: true, enabled: enabledBeforePrompt }
      } catch (error) {
        console.error('IPC: Error requesting accessibility:', error)
        return { supported: true, enabled: false, error: error.message }
      }
    })
    // --- End Accessibility Check IPC Handler ---

    // --- Microphone Permission Check IPC Handler (macOS/Windows) ---
    ipcMain.handle('check-microphone-permission', async () => {
      const platform = process.platform
      if (platform !== 'darwin' && platform !== 'win32') {
        return { supported: false, status: 'not-supported' } // Only check on macOS/Windows
      }
      try {
        const status = await systemPreferences.getMediaAccessStatus(
          'microphone'
        )
        console.log(
          `IPC: Microphone permission check requested. Status: ${status}`
        )
        // Status can be 'not-determined', 'granted', 'denied', 'restricted'
        return { supported: true, status: status }
      } catch (error) {
        console.error('IPC: Error checking microphone permission:', error)
        return { supported: true, status: 'error', error: error.message }
      }
    })
    // --- End Microphone Permission Check IPC Handler ---

    // --- End Web Audio API IPC Handlers ---

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
// Default export is at the class declaration now
