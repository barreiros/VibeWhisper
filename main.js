// Load environment variables from .env file
require('dotenv').config()

const {
  app,
  BrowserWindow,
  ipcMain,
  globalShortcut,
  Tray,
  Menu,
  nativeImage, // Import nativeImage
} = require('electron')
const path = require('path')
const fs = require('fs') // Required for file system operations
// Removed child_process as we now use OpenAI API
// Note: electron-store will be imported dynamically later
const record = require('node-record-lpcm16') // For audio recording
const { keyboard, Key, clipboard } = require('@nut-tree-fork/nut-js') // Import clipboard and Key
const OpenAI = require('openai') // Import OpenAI library

// --- OpenAI Client Initialization ---
let openai
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
  console.log('OpenAI client initialized.')
} else {
  console.error(
    'FATAL: OPENAI_API_KEY environment variable not set. Please set it in .env or your system environment.'
  )
  // Optionally, exit the app or disable transcription if the key is missing
  // app.quit(); // Example: Exit if key is crucial
}

// --- Configuration ---
// Removed modelsDir as it's no longer needed
const tempAudioDir = path.join(__dirname, 'temp-audio') // Store temp audio locally
const tempAudioFile = path.join(tempAudioDir, 'temp_audio.wav') // Temporary audio file path

// Ensure temp audio directory exists
if (!fs.existsSync(tempAudioDir)) {
  fs.mkdirSync(tempAudioDir, { recursive: true })
}

// Store will be initialized after app is ready and electron-store is imported
let store
let mainWindow
let tray = null
let currentHotkey // Will be set after store is initialized
let isRecording = false // State variable for recording status
let recordingProcess = null // To hold the recording process instance
let audioFileStream = null // To hold the file stream instance
// Removed pollIntervalId

// --- Transcription Function (using OpenAI API) ---
async function transcribeAudio(filePath) {
  // Check if the temp file still exists before transcribing
  if (!fs.existsSync(filePath)) {
    console.warn(
      `Transcription skipped: Temp audio file not found at ${filePath}`
    )
    return
  }

  // Check if OpenAI client is initialized (API Key exists)
  if (!openai) {
    console.error('OpenAI API key not configured. Cannot transcribe.')
    // Clean up temp file
    try {
      fs.unlinkSync(filePath)
      console.log(`Deleted temporary audio file: ${filePath}`)
    } catch (e) {}
    return
  }

  console.log(`Attempting transcription via OpenAI API for: ${filePath}`)

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath), // Create a read stream from the file
      model: 'whisper-1', // Use the standard whisper-1 model
      // language: "es", // Optional: Specify language if known
      // response_format: "text" // Optional: Get plain text directly
    })

    console.log('OpenAI API response received.')
    // The result is usually in transcription.text if using default response_format (json)
    const resultText = transcription?.text?.trim()

    if (resultText) {
      console.log('Transcription Result:', resultText)
      try {
        // --- Use Clipboard and Paste Shortcut ---
        console.log('Setting clipboard content...')
        await clipboard.setContent(resultText)
        console.log('Simulating paste shortcut...')
        const modifierKey =
          process.platform === 'darwin' ? Key.LeftSuper : Key.LeftControl // Cmd on Mac, Ctrl elsewhere
        await keyboard.pressKey(modifierKey)
        await keyboard.pressKey(Key.V)
        await keyboard.releaseKey(Key.V)
        await keyboard.releaseKey(modifierKey)
        console.log('Paste shortcut simulated.')
        // --- End Clipboard Paste ---

        // Original typing method (commented out)
        // await keyboard.type(resultText)
        // console.log('Pasted text.')
      } catch (pasteError) {
        console.error('Error pasting text with nut-js:', pasteError)
      }
    } else {
      console.log(
        'Transcription result from OpenAI was empty or in unexpected format.'
      )
      console.log('Raw OpenAI response:', JSON.stringify(transcription)) // Log raw response for debugging
    }
  } catch (error) {
    console.error('OpenAI API transcription failed:', error)
    // Log more details if available
    if (error.response) {
      console.error('API Error Status:', error.response.status)
      console.error('API Error Data:', error.response.data)
    }
  } finally {
    // Clean up the temporary audio file
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath)
        console.log(`Deleted temporary audio file: ${filePath}`)
      } catch (unlinkErr) {
        console.error(`Error deleting temp audio file: ${unlinkErr}`)
      }
    }
  }
}

// --- File Stability Check Function (REMOVED - No longer needed for API) ---
// function checkFileAndTranscribe() { ... }

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false, // Best practice for security
      contextIsolation: true, // Best practice for security
    },
    show: false, // Initially hide the window
    skipTaskbar: true, // Don't show in taskbar, runs in background
  })

  // Load the index.html of the app.
  mainWindow.loadFile('index.html')

  // Open the DevTools (optional, for debugging)
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', function () {
    mainWindow = null
  })

  // Hide the window instead of closing it when the user clicks the close button
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault()
      mainWindow.hide()
    }
    return false
  })
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets/iconTemplate.png') // Restore original path
  try {
    // Restore using nativeImage with the original file path
    const image = nativeImage.createFromPath(iconPath)
    if (image.isEmpty()) {
      throw new Error(
        'Created nativeImage is empty. Check file format/corruption.'
      )
    }
    console.log('Attempting to create Tray with original icon file...') // Log attempt
    tray = new Tray(image) // Pass the nativeImage object
    console.log('Tray object created:', tray ? 'Success' : 'Failed') // Add logging

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Settings',
        type: 'normal',
        click: () => {
          // Open settings window or show main window
          if (mainWindow) {
            mainWindow.show()
          } else {
            createWindow()
            mainWindow.show()
          }
        },
      },
      {
        label: 'Quit',
        type: 'normal',
        click: () => {
          app.isQuitting = true
          app.quit()
        },
      },
    ])
    // Keep logging for consistency
    console.log('Setting tooltip...')
    tray.setToolTip('Barreiros SuperWhisper')
    console.log('Setting context menu...')
    tray.setContextMenu(contextMenu)
    console.log('Tray setup complete.')

    tray.on('click', () => {
      // Toggle main window visibility on tray icon click (optional)
      // if (mainWindow) {
      //   mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
      // }
    })
  } catch (error) {
    console.error(
      "Failed to create tray icon. Ensure 'assets/iconTemplate.png' exists.", // Simplified error message
      error
    )
    // Proceed without tray icon if it fails
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Dynamically import electron-store
  const { default: Store } = await import('electron-store')

  // Initialize electron-store now that the module is loaded
  store = new Store({
    defaults: {
      hotkey: 'CommandOrControl+Shift+Space',
      // model: 'base', // No longer needed for OpenAI
      microphone: 'default',
    },
  })

  // Initialize variables dependent on store
  currentHotkey = store.get('hotkey')

  // Now proceed with creating UI and registering shortcuts
  createTray()
  createWindow() // Create the main window but keep it hidden initially

  // --- Global Shortcut Registration ---
  function registerCurrentHotkey() {
    // Unregister existing shortcut if necessary
    globalShortcut.unregisterAll() // Simplest approach for now

    // Ensure currentHotkey has a value before registering
    if (!currentHotkey) {
      console.error('Hotkey is not defined, cannot register shortcut.')
      // Attempt to get from store again or use default?
      currentHotkey = store.get('hotkey') // Re-fetch just in case
      if (!currentHotkey) {
        console.error(
          'Failed to get hotkey from store. Aborting shortcut registration.'
        )
        return // Exit if still no hotkey
      }
    }

    const ret = globalShortcut.register(currentHotkey, () => {
      console.log(`Global shortcut ${currentHotkey} pressed`)
      if (isRecording) {
        // --- Stop Recording ---
        console.log('Stopping recording...')
        isRecording = false // Set state immediately

        // Stop the underlying recording process first
        if (recordingProcess) {
          recordingProcess.stop()
          recordingProcess = null
          console.log('Recording process stopped.')
        } else {
          console.warn('Recording process was null when trying to stop.')
        }

        // Use the 'finish' event on the stream, which should be reliable now
        if (audioFileStream) {
          console.log('Setting up stream close handlers and ending stream...')
          const streamInstance = audioFileStream // Keep a reference locally
          audioFileStream = null // Nullify the main variable immediately

          streamInstance.on('finish', () => {
            console.log('Audio file stream finished writing.')
            console.log('Starting transcription via OpenAI API...')
            transcribeAudio(tempAudioFile) // Transcribe *after* stream is finished
          })
          streamInstance.on('error', (err) => {
            console.error('Error writing audio file stream:', err)
            // Clean up temp file on stream error too
            if (fs.existsSync(tempAudioFile)) {
              try {
                fs.unlinkSync(tempAudioFile)
              } catch (e) {}
            }
          })

          // End the stream AFTER listeners are attached
          streamInstance.end()
          console.log('Called .end() on stream.')
        } else {
          console.warn('Audio file stream was already null when stopping.')
          // If stream is null, maybe the file is already closed? Risky.
          // Let's just log and do nothing, transcription won't happen.
        }
      } else {
        // --- Start Recording ---
        console.log('Starting recording...')
        isRecording = true
        // Update tray icon or give feedback (optional)
        // tray?.setImage(path.join(__dirname, 'assets/iconRecordingTemplate.png')); // Example

        // Ensure temp audio directory exists and previous temp file is deleted if it exists
        if (!fs.existsSync(tempAudioDir)) {
          fs.mkdirSync(tempAudioDir, { recursive: true })
        }
        if (fs.existsSync(tempAudioFile)) {
          try {
            fs.unlinkSync(tempAudioFile)
            console.log(`Deleted previous temp audio file: ${tempAudioFile}`)
          } catch (err) {
            console.error(`Failed to delete previous temp audio file: ${err}`)
          }
        }

        // Create a write stream for the temporary audio file
        try {
          audioFileStream = fs.createWriteStream(tempAudioFile, {
            encoding: 'binary',
          })
          console.log(`Recording to: ${tempAudioFile}`) // Log path *after* successful stream creation
        } catch (err) {
          console.error(
            `Failed to create write stream for temp audio file: ${err}`
          )
          isRecording = false // Reset recording state
          return // Stop if we can't write the file
        }

        // Start recording using node-record-lpcm16
        const micId = store.get('microphone', 'default') // Get selected mic ID
        const recordingOptions = {
          sampleRateHertz: 16000,
          channels: 1,
          threshold: 0.5, // Silence threshold
          verbose: false, // Set true for debugging
          recordProgram: 'rec', // Or 'sox', 'arecord', etc. depending on OS/availability
          silence: '1.0', // Seconds of silence to end recording (we stop manually)
        }
        // Add device ID if not 'default'
        if (micId !== 'default') {
          recordingOptions.device = micId
        }

        recordingProcess = record.record(recordingOptions)

        recordingProcess.stream().on('error', (err) => {
          console.error('Recording stream error:', err)
          isRecording = false // Reset state on error
          // Clean up
          if (recordingProcess) recordingProcess.stop()
          if (audioFileStream) audioFileStream.end()
          recordingProcess = null
          audioFileStream = null
          // Notify user?
        })

        // Pipe the audio data to the file stream
        recordingProcess.stream().pipe(audioFileStream)

        // console.log(`Recording to: ${tempAudioFile}`) // REMOVE duplicate log
      }
    })

    if (!ret) {
      console.error(`Failed to register global shortcut: ${currentHotkey}`)
      // Optionally notify the user through the settings window
      if (mainWindow) {
        mainWindow.webContents.send(
          'shortcut-registration-failed',
          currentHotkey
        )
      }
    } else {
      console.log(`Global shortcut ${currentHotkey} registered successfully.`)
    }
  }

  registerCurrentHotkey() // Register initially

  // --- IPC Handlers ---
  // Handle request from renderer to get current settings
  ipcMain.handle('get-settings', async (event) => {
    return {
      hotkey: store.get('hotkey'),
      // model: store.get('model'), // Removed model setting
      microphone: store.get('microphone'),
    }
  })

  // Handle request from renderer to set a new hotkey
  ipcMain.handle('set-hotkey', async (event, newHotkey) => {
    try {
      console.log(`Attempting to set new hotkey: ${newHotkey}`)
      store.set('hotkey', newHotkey)
      currentHotkey = newHotkey // Update the current hotkey in memory
      registerCurrentHotkey() // Re-register with the new hotkey
      return { success: true }
    } catch (error) {
      console.error('Error setting hotkey:', error)
      // Attempt to re-register the old hotkey if setting the new one failed badly
      registerCurrentHotkey()
      return { success: false, error: error.message }
    }
  })

  // Handle request from renderer to set the model (REMOVED - No longer applicable)
  // ipcMain.on('set-model', (event, model) => { ... })

  // Handle request from renderer to set the microphone
  ipcMain.on('set-microphone', (event, micId) => {
    console.log(`Setting microphone to: ${micId}`)
    store.set('microphone', micId)
    // TODO: Add logic here if the audio input stream needs to be changed immediately
  })

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    // Since we want this to be a background app, we might not need this,
    // but let's keep the main window accessible via tray.
    if (BrowserWindow.getAllWindows().length === 0) {
      if (mainWindow === null) {
        createWindow()
      }
      mainWindow.show() // Show window if activated and hidden
    } else if (mainWindow) {
      mainWindow.show() // Show existing window if hidden
    }
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  // We want the app to stay running in the background via the tray icon,
  // so we don't quit here unless explicitly told to (via tray menu).
  // if (process.platform !== 'darwin') {
  //   app.quit();
  // }
})

app.on('will-quit', () => {
  // Unregister all shortcuts.
  globalShortcut.unregisterAll()
})

// Ensure the app doesn't show in the dock on macOS
if (process.platform === 'darwin') {
  app.dock.hide()
}
