// Load environment variables from .env file first
require('dotenv').config()

const { app, dialog } = require('electron') // Add dialog
const path = require('path')
const OpenAI = require('openai') // Import OpenAI here for initialization

// Import Manager Classes
const AppManager = require('./AppManager')
const WindowManager = require('./WindowManager')
const SettingsStore = require('./SettingsStore') // Now exports the class
const TrayManager = require('./TrayManager')
const HotkeyManager = require('./HotkeyManager')
const IpcHandler = require('./IpcHandler')
const AudioRecorder = require('./AudioRecorder')
const TranscriptionService = require('./TranscriptionService')

// --- Enable electron-reload for development ---
if (process.env.NODE_ENV !== 'production') {
  try {
    // Adjust the path for electron-reload to watch the new structure
    require('electron-reload')(path.join(__dirname, '..', '..'), {
      // Watch root directory
      electron: require(path.join(
        __dirname,
        '..',
        '..',
        'node_modules',
        'electron'
      )),
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
    // audioRecorder: audioRecorder, // AppManager doesn't directly need recorder?
    // transcriptionService: transcriptionService // AppManager doesn't directly need transcription?
  })

  ipcHandler.setManagers({
    appManager: appManager,
    hotkeyManager: hotkeyManager,
    windowManager: windowManager,
    audioRecorder: audioRecorder, // IPC needs to trigger recorder
    // transcriptionService: transcriptionService // IPC doesn't directly trigger transcription?
    settingsStore: settingsStore, // Pass to IPC Handler via setter if needed
  })

  // Set the callback for the hotkey manager to use the audio recorder's toggle method
  hotkeyManager.setToggleCallback(
    audioRecorder.toggleRecording.bind(audioRecorder)
  )

  // Initialize the AppManager, which handles app lifecycle events and starts the app
  appManager.init()

  console.log('Main Index: Application initialization sequence complete.')
}

// Start the application
initializeApp()
