// Load environment variables from .env file first
import 'dotenv/config' // Use side-effect import

import { app, dialog, systemPreferences } from 'electron' // Add systemPreferences
import path, { dirname } from 'path' // Import dirname as well
import { fileURLToPath } from 'url' // Needed for __dirname equivalent
import { createRequire } from 'module' // Needed for CommonJS modules like electron-reload
import OpenAI from 'openai' // Import OpenAI here for initialization
// Removed execSync and os imports related to SoX check

// Import Manager Classes (add .js extension)
import AppManager from './AppManager.js'
import WindowManager from './WindowManager.js'
import SettingsStore from './SettingsStore.js' // Now exports the class
import TrayManager from './TrayManager.js'
import HotkeyManager from './HotkeyManager.js'
import IpcHandler from './IpcHandler.js'
import AudioRecorder from './AudioRecorder.js'
import TranscriptionService from './TranscriptionService.js'

// --- ESM __dirname equivalent ---
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
// --- End ESM __dirname equivalent ---

// --- Enable electron-reload for development ---
// electron-reload might be CommonJS, so use createRequire
const require = createRequire(import.meta.url)

if (process.env.NODE_ENV !== 'production') {
  try {
    const electronReload = require('electron-reload')
    const electronPath = require(path.join(
      __dirname,
      '..',
      '..',
      'node_modules',
      'electron'
    ))

    // Adjust the path for electron-reload to watch the new structure
    electronReload(path.join(__dirname, '..', '..'), {
      // Watch root directory
      electron: electronPath,
      // Specify folders/files to watch more precisely if needed
      // e.g., watch: [path.join(__dirname, '..'), path.join(__dirname, '..', '..', '*.html'), ...]
      hardResetMethod: 'exit',
      forceHardReset: true,
    })
    console.log('Main Index: electron-reload enabled.')
  } catch (err) {
    console.warn(
      'Main Index: electron-reload could not be loaded. Ensure it is installed as a devDependency.',
      err
    )
  }
}
// --- End electron-reload ---

// --- Main Application Initialization ---
async function initializeApp() {
  // Make async
  console.log('Main Index: Initializing application...')

  // --- SoX Check Removed ---

  // --- Accessibility Check (macOS) ---
  if (process.platform === 'darwin') {
    const accessibilityEnabled =
      systemPreferences.isTrustedAccessibilityClient(true) // Check and prompt
    console.log(`Main Index: Accessibility trusted: ${accessibilityEnabled}`)
    if (!accessibilityEnabled) {
      // Even if prompted, the return value reflects the status *before* the user might grant it.
      // Show an informational dialog guiding the user.
      dialog
        .showMessageBox({
          type: 'info',
          title: 'Accessibility Access Required',
          message:
            'VibeWhisper needs Accessibility access to paste transcribed text.',
          detail:
            "If pasting doesn't work, please go to System Settings > Privacy & Security > Accessibility and ensure VibeWhisper is enabled. You may need to restart the application after granting access.",
          buttons: ['OK'],
        })
        .catch((err) =>
          console.error('Failed to show accessibility dialog:', err)
        ) // Catch potential errors showing dialog
    }
  }
  // --- End Accessibility Check ---

  // Instantiate and initialize SettingsStore first
  const settingsStore = new SettingsStore()
  try {
    await settingsStore.init()
  } catch (error) {
    console.error(
      'FATAL: Failed to initialize SettingsStore. Application cannot start.',
      error
    )
    // Show error dialog before quitting
    if (app && dialog) {
      dialog.showErrorBox(
        'Fatal Error',
        `Failed to initialize application settings. The application will now exit.\n\n${
          error.stack || error
        }`
      )
    }
    app.quit()
    return // Stop further execution
  }

  // Instantiate Other Managers (order might matter based on dependencies)
  // Pass the initialized settingsStore instance where needed
  const appManager = new AppManager(settingsStore) // Pass settingsStore
  const windowManager = new WindowManager(appManager) // Pass appManager reference
  windowManager.createBackgroundWindow() // Create the hidden background window early
  const trayManager = new TrayManager(windowManager) // Pass windowManager reference
  const hotkeyManager = new HotkeyManager(settingsStore) // Pass settingsStore
  const transcriptionService = new TranscriptionService(
    windowManager,
    settingsStore
  ) // Pass windowManager & settingsStore
  const audioRecorder = new AudioRecorder(
    transcriptionService,
    windowManager,
    settingsStore
  ) // Pass dependencies & settingsStore
  const ipcHandler = new IpcHandler(settingsStore) // Pass settingsStore

  // Initialize OpenAI Client (centralized)
  let openaiClient = null
  // Use the initialized settingsStore instance here
  const apiKey = settingsStore.get('apiKey') || process.env.OPENAI_API_KEY
  if (apiKey) {
    try {
      openaiClient = new OpenAI({ apiKey })
      console.log('Main Index: OpenAI client initialized successfully.')
      transcriptionService.setOpenAIClient(openaiClient) // Provide client to service
    } catch (error) {
      console.error('Main Index: Failed to initialize OpenAI client:', error)
      openaiClient = null
    }
  } else {
    console.error(
      'Main Index: OpenAI API Key not found in settings or .env file.'
    )
  }

  // Set references between managers (pass settingsStore if needed via setters too, though constructor is preferred)
  appManager.setManagers({
    windowManager: windowManager,
    trayManager: trayManager,
    hotkeyManager: hotkeyManager,
    ipcHandler: ipcHandler,
    // Removed reinitializeOpenAI from here
    // audioRecorder: audioRecorder, // AppManager doesn't directly need recorder?
    // transcriptionService: transcriptionService // AppManager doesn't directly need transcription?
  })

  ipcHandler.setManagers({
    // Removed appManager reference as it's not needed for re-init now
    hotkeyManager: hotkeyManager,
    windowManager: windowManager,
    audioRecorder: audioRecorder, // Keep for now, might change how it's used
    transcriptionService: transcriptionService, // Pass TranscriptionService to IPC Handler
    settingsStore: settingsStore,
    reinitializeOpenAI: () =>
      initializeOrReinitializeOpenAIClient(settingsStore), // Pass re-init function directly
  })

  // Set the callback for the hotkey manager to use the audio recorder's toggle method
  hotkeyManager.setToggleCallback(
    audioRecorder.toggleRecording.bind(audioRecorder)
  )

  // Initialize the AppManager, which handles app lifecycle events and starts the app
  appManager.init()

  console.log('Main Index: Application initialization sequence complete.')
}

// --- OpenAI Client Initialization Logic ---
let openaiClient = null // Keep client instance accessible
let transcriptionServiceRef = null // Keep reference to transcription service

async function initializeOrReinitializeOpenAIClient(settingsStore) {
  const apiKey = settingsStore.get('apiKey') || process.env.OPENAI_API_KEY
  // DEBUG: Log the key being used for initialization/re-initialization
  console.log(
    `[OpenAI Init] Using API Key starting with: ${
      apiKey ? apiKey.substring(0, 5) + '...' : 'NONE'
    }`
  )
  if (apiKey) {
    try {
      openaiClient = new OpenAI({ apiKey })
      console.log('OpenAI client initialized/re-initialized successfully.')
      if (transcriptionServiceRef) {
        transcriptionServiceRef.setOpenAIClient(openaiClient) // Update service
      } else {
        console.warn(
          'TranscriptionService reference not yet available during OpenAI init.'
        )
      }
      return true // Indicate success
    } catch (error) {
      console.error('Failed to initialize/re-initialize OpenAI client:', error)
      openaiClient = null
      if (transcriptionServiceRef) {
        transcriptionServiceRef.setOpenAIClient(null) // Clear client in service on error
      }
      return false // Indicate failure
    }
  } else {
    console.error('OpenAI API Key not found in settings or .env file.')
    openaiClient = null
    if (transcriptionServiceRef) {
      transcriptionServiceRef.setOpenAIClient(null) // Clear client in service
    }
    return false // Indicate failure (no key)
  }
}
// --- End OpenAI Client Initialization Logic ---

// --- Main Application Initialization ---
// REMOVED DUPLICATE initializeApp definition that started here.
// The correct definition is above this section.

// Start the application
initializeApp() // Call the original function defined earlier
