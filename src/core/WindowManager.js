import { BrowserWindow } from 'electron'
import path, { dirname } from 'path' // Import dirname
import { fileURLToPath } from 'url' // Needed for __dirname equivalent

// --- ESM __dirname equivalent ---
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
// --- End ESM __dirname equivalent ---

export default class WindowManager {
  // Use export default
  constructor(appManager) {
    this.appManager = appManager // Reference to AppManager for isQuitting flag
    this.settingsWindow = null
    this.transcriptionWindow = null
    console.log('WindowManager initialized.')
  }

  createSettingsWindow() {
    if (this.settingsWindow && !this.settingsWindow.isDestroyed()) {
      console.log('WindowManager: Settings window already exists.')
      this.settingsWindow.focus()
      return this.settingsWindow
    }

    console.log('WindowManager: Creating settings window...')
    this.settingsWindow = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        // Use a dedicated preload script for settings
        preload: path.join(__dirname, '..', 'preload', 'settingsPreload.js'), // Corrected path relative to this file
        nodeIntegration: false,
        contextIsolation: true,
      },
      show: false, // Start hidden
    })

    // Load the settings.html of the app.
    this.settingsWindow.loadFile(
      path.join(__dirname, '..', 'window', 'settings.html')
    ) // Updated path to settings.html

    // Open the DevTools (optional, for debugging)
    this.settingsWindow.webContents.openDevTools() // <-- Uncommented

    this.settingsWindow.on('closed', () => {
      console.log('WindowManager: Settings window closed.')
      this.settingsWindow = null
    })

    // Hide the window instead of closing it when the user clicks the close button
    this.settingsWindow.on('close', (event) => {
      if (!this.appManager.getIsQuitting()) {
        console.log('WindowManager: Hiding settings window instead of closing.')
        event.preventDefault()
        this.settingsWindow.hide()
      } else {
        console.log(
          'WindowManager: Allowing settings window to close (app quitting).'
        )
      }
      // Return false is deprecated for preventing close
    })

    console.log('WindowManager: Settings window created.')
    return this.settingsWindow
  }

  createTranscriptionWindow() {
    if (this.transcriptionWindow && !this.transcriptionWindow.isDestroyed()) {
      console.log('WindowManager: Transcription window already exists.')
      // Ensure it's visible if called again while existing
      if (!this.transcriptionWindow.isVisible()) {
        this.transcriptionWindow.showInactive() // Show without focusing
      }
      // No longer trying to focus it here
      return this.transcriptionWindow
    }

    console.log('WindowManager: Creating transcription window...')
    this.transcriptionWindow = new BrowserWindow({
      width: 300, // Adjust size later if needed for just a button
      height: 150, // Adjust size later if needed for just a button
      frame: false,
      transparent: true, // <-- Add transparency
      hasShadow: false, // <-- Disable window shadow for better transparency
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: true,
      show: false, // Start hidden, show when ready
      webPreferences: {
        // Use a dedicated preload script for transcription
        preload: path.join(
          __dirname,
          '..',
          'preload',
          'transcriptionPreload.js'
        ), // Corrected path relative to this file
        nodeIntegration: false,
        contextIsolation: true,
      },
    })

    this.transcriptionWindow.loadFile(
      path.join(__dirname, '..', 'window', 'transcription.html')
    ) // Updated path

    // Open the DevTools for the transcription window
    this.transcriptionWindow.webContents.openDevTools({ mode: 'detach' }) // <-- Added, detach to avoid overlapping small window

    this.transcriptionWindow.on('closed', () => {
      console.log('WindowManager: Transcription window closed.')
      this.transcriptionWindow = null
    })

    // Show after a short delay to allow loading, without activating/focusing
    this.transcriptionWindow.once('ready-to-show', () => {
      console.log(
        'WindowManager: Transcription window ready to show (inactive).'
      )
      this.transcriptionWindow.showInactive() // Show without taking focus
      // Initial message sending will be handled by the calling logic (e.g., AudioRecorder)
    })

    console.log('WindowManager: Transcription window created.')
    return this.transcriptionWindow
  }

  getSettingsWindow() {
    return this.settingsWindow
  }

  getTranscriptionWindow() {
    return this.transcriptionWindow
  }

  showSettingsWindow() {
    if (this.settingsWindow && !this.settingsWindow.isDestroyed()) {
      console.log('WindowManager: Showing settings window.')
      this.settingsWindow.show()
      this.settingsWindow.focus()
    } else {
      console.log('WindowManager: Settings window not found, creating...')
      this.createSettingsWindow() // Will show automatically
    }
  }

  showTranscriptionWindow() {
    if (this.transcriptionWindow && !this.transcriptionWindow.isDestroyed()) {
      console.log('WindowManager: Showing transcription window (inactive).')
      this.transcriptionWindow.showInactive() // Show without taking focus
      // Optionally send 'Listening...' message here or let caller handle it
      // this.sendToTranscriptionWindow('transcription-update', 'Listening...');
    } else {
      console.log('WindowManager: Transcription window not found, creating...')
      this.createTranscriptionWindow() // Will show when ready
    }
  }

  closeTranscriptionWindow() {
    if (this.transcriptionWindow && !this.transcriptionWindow.isDestroyed()) {
      console.log('WindowManager: Closing transcription window.')
      // Send close signal first (optional, allows renderer to clean up)
      // this.sendToTranscriptionWindow('close-transcription-window');
      this.transcriptionWindow.close() // This will trigger the 'closed' event which nulls the reference
    } else {
      console.log(
        "WindowManager: Transcription window already closed or doesn't exist."
      )
    }
  }

  // Helper to send messages to a specific window
  sendToWindow(windowInstance, channel, ...args) {
    if (
      windowInstance &&
      !windowInstance.isDestroyed() &&
      windowInstance.webContents
    ) {
      windowInstance.webContents.send(channel, ...args)
      // console.log(`WindowManager: Sent IPC message on channel '${channel}' to window.`);
    } else {
      // console.warn(`WindowManager: Attempted to send IPC message on channel '${channel}', but window is invalid.`);
    }
  }

  sendToSettingsWindow(channel, ...args) {
    this.sendToWindow(this.settingsWindow, channel, ...args)
  }

  sendToTranscriptionWindow(channel, ...args) {
    this.sendToWindow(this.transcriptionWindow, channel, ...args)
  }

  // Send log messages to the settings window
  logToSettingsWindow(level, ...args) {
    const message = args
      .map((arg) =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
      )
      .join(' ')
    this.sendToSettingsWindow(
      'log-message',
      `[${level.toUpperCase()}] ${message}`
    )
  }
}
// Default export is at the class declaration now
