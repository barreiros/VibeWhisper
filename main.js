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

// Enable electron-reload for development
if (process.env.NODE_ENV !== 'production') {
  try {
    require('electron-reload')(__dirname, {
      electron: require(path.join(__dirname, 'node_modules', 'electron')),
      // Watch main process files, preload, HTML, and the generated CSS
      hardResetMethod: 'exit',
      forceHardReset: true, // Ensures main process restarts on change
      // You might need to adjust the paths depending on your exact structure
      // Watching __dirname covers main.js, preload.js, renderer.js, html files etc.
      // We also specifically watch the generated output.css
      // Note: Watching node_modules is generally avoided.
    })
    console.log('electron-reload enabled.')
  } catch (err) {
    console.warn(
      'electron-reload could not be loaded. Ensure it is installed as a devDependency.',
      err
    )
  }
}

// --- OpenAI Client Initialization ---
let openai
// let store; // Removed duplicate declaration - store is declared later

function initializeOpenAIClient() {
  // Prioritize key from store, fallback to .env
  const apiKeyFromStore = store?.get('apiKey')
  const apiKey = apiKeyFromStore || process.env.OPENAI_API_KEY

  if (apiKey) {
    try {
      openai = new OpenAI({ apiKey })
      console.log('OpenAI client initialized successfully.')
      return true
    } catch (error) {
      console.error(
        'Failed to initialize OpenAI client with the provided key:',
        error
      )
      openai = null // Ensure client is null if initialization fails
      return false
    }
  } else {
    console.error(
      'OpenAI API Key not found in settings or .env file. Please set it in the application settings.'
    )
    openai = null // Ensure client is null if no key is found
    return false
  }
}

// --- Configuration ---
// Removed modelsDir as it's no longer needed
// Use app's temp directory for temporary audio storage
const tempBaseDir = app.getPath('temp')
const tempAudioDir = path.join(tempBaseDir, 'barreiros-superwhisper-audio') // App-specific subfolder
const tempAudioFile = path.join(tempAudioDir, 'temp_audio.wav') // Temporary audio file path

// Ensure temp audio directory exists
try {
  if (!fs.existsSync(tempAudioDir)) {
    fs.mkdirSync(tempAudioDir, { recursive: true })
    console.log(`Created temporary audio directory: ${tempAudioDir}`)
  }
} catch (error) {
  console.error(
    `Failed to create temporary audio directory at ${tempAudioDir}:`,
    error
  )
  // Handle error appropriately - maybe disable recording?
}

// Store will be initialized after app is ready and electron-store is imported
let store
let mainWindow
let transcriptionWindow = null // Added for transcription display
let tray = null
let currentHotkey // Will be set after store is initialized
let isRecording = false // State variable for recording status
let recordingProcess = null // To hold the recording process instance
let audioFileStream = null // To hold the file stream instance
let recordingTimerId = null // To hold the automatic stop timer ID
let recordingStartTime = null // Added to track recording duration
// Removed pollIntervalId

// --- Transcription Function (using OpenAI API) ---
async function transcribeAudio(filePath) {
  console.log('[Transcribe Debug] transcribeAudio function started.') // ADDED
  // Check if the temp file still exists before transcribing
  if (!fs.existsSync(filePath)) {
    console.warn(
      // ADDED prefix
      `[Transcribe Debug] Transcription skipped: Temp audio file not found at ${filePath}`
    )
    return
  }

  // Check if OpenAI client is initialized (API Key exists)
  if (!openai) {
    console.error(
      '[Transcribe Debug] OpenAI API key not configured. Cannot transcribe.'
    ) // ADDED prefix
    // Clean up temp file
    try {
      fs.unlinkSync(filePath)
      console.log(
        `[Transcribe Debug] Deleted temporary audio file: ${filePath}`
      ) // ADDED prefix
    } catch (e) {}
    return
  }

  console.log(
    `[Transcribe Debug] Attempting transcription via OpenAI API for: ${filePath}`
  ) // ADDED prefix

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath), // Create a read stream from the file
      model: 'whisper-1', // Use the standard whisper-1 model
      // language: "es", // Optional: Specify language if known
      // response_format: "text" // Optional: Get plain text directly
    })

    console.log('[Transcribe Debug] OpenAI API response received.') // ADDED prefix
    // The result is usually in transcription.text if using default response_format (json)
    const resultText = transcription?.text?.trim()
    // Log the received text *before* the check
    console.log(
      '[Paste Debug] Received transcription text:',
      resultText ? `"${resultText}"` : resultText
    )

    if (resultText) {
      console.log('[Transcribe Debug] Transcription Result:', resultText) // ADDED prefix & Keep original log for clarity

      // Send update to transcription window if it exists
      if (transcriptionWindow && !transcriptionWindow.isDestroyed()) {
        transcriptionWindow.webContents.send('transcription-update', resultText)
      }

      // --- Detailed Paste Simulation ---
      try {
        console.log('[Paste Debug] Attempting to set clipboard content...')
        await clipboard.setContent(resultText)
        console.log('[Paste Debug] Clipboard content set (or attempted).')
        // Optional: Verify clipboard content (might require additional permissions or libraries)
        // const currentClipboard = await clipboard.getContent();
        // console.log('[Paste Debug] Current clipboard content:', currentClipboard);

        console.log('[Paste Debug] Simulating paste shortcut...')
        const modifierKey =
          process.platform === 'darwin' ? Key.LeftSuper : Key.LeftControl // Cmd on Mac, Ctrl elsewhere
        console.log(`[Paste Debug] Pressing modifier key: ${Key[modifierKey]}`)
        await keyboard.pressKey(modifierKey)
        console.log(`[Paste Debug] Pressing key: ${Key[Key.V]}`)
        await keyboard.pressKey(Key.V)
        console.log(`[Paste Debug] Releasing key: ${Key[Key.V]}`)
        await keyboard.releaseKey(Key.V)
        console.log(`[Paste Debug] Releasing modifier key: ${Key[modifierKey]}`)
        await keyboard.releaseKey(modifierKey)
        console.log('[Paste Debug] Paste shortcut simulation complete.')
      } catch (pasteError) {
        console.error(
          '[Paste Debug] Error during paste simulation:',
          pasteError
        )
      }
      // --- End Detailed Paste Simulation ---
    } else {
      console.log(
        // ADDED prefix
        '[Transcribe Debug] Transcription result from OpenAI was empty or in unexpected format.'
      )
      console.log(
        '[Transcribe Debug] Raw OpenAI response:',
        JSON.stringify(transcription)
      ) // ADDED prefix & Log raw response for debugging
    }
  } catch (error) {
    console.error('[Transcribe Debug] OpenAI API transcription failed:', error) // ADDED prefix
    // Log more details if available
    if (error.response) {
      console.error(
        '[Transcribe Debug] API Error Status:',
        error.response.status
      ) // ADDED prefix
      console.error('[Transcribe Debug] API Error Data:', error.response.data) // ADDED prefix
    }
  } finally {
    // Clean up the temporary audio file
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath)
        console.log(
          `[Transcribe Debug] Deleted temporary audio file: ${filePath}`
        ) // ADDED prefix
      } catch (unlinkErr) {
        console.error(
          `[Transcribe Debug] Error deleting temp audio file: ${unlinkErr}`
        ) // ADDED prefix
      }
    }
  }
}

// --- File Stability Check Function (REMOVED - No longer needed for API) ---
// function checkFileAndTranscribe() { ... }

// --- Stop Recording and Transcribe Function ---
function stopRecordingAndTranscribe() {
  if (!isRecording) {
    console.log('Stop requested, but not currently recording.')
    return // Already stopped or not started
  }

  console.log('Stopping recording...')
  isRecording = false // Set state immediately

  // Calculate duration
  let durationSeconds = 0
  if (recordingStartTime) {
    const endTime = Date.now()
    durationSeconds = (endTime - recordingStartTime) / 1000
    console.log(`Recorded duration: ${durationSeconds.toFixed(2)} seconds`)
    recordingStartTime = null // Reset start time
  } else {
    console.warn(
      'Could not determine recording duration: start time not recorded.'
    )
  }

  // Store cumulative duration
  if (durationSeconds > 0) {
    const currentTotal = store.get('totalDurationSeconds', 0)
    const newTotal = currentTotal + durationSeconds
    store.set('totalDurationSeconds', newTotal)
    console.log(`Updated total duration: ${newTotal.toFixed(2)} seconds`)
  }

  // Clear the automatic stop timer if it exists
  if (recordingTimerId) {
    clearTimeout(recordingTimerId)
    recordingTimerId = null
    console.log('Cleared automatic stop timer.')
  }

  // Stop the underlying recording process first
  if (recordingProcess) {
    recordingProcess.stop()
    recordingProcess = null
    console.log('Recording process stopped.')
  } else {
    console.warn('Recording process was null when trying to stop.')
  }

  // Use the 'finish' event on the stream
  if (audioFileStream) {
    console.log('Setting up stream close handlers and ending stream...')
    const streamInstance = audioFileStream // Keep a reference locally
    audioFileStream = null // Nullify the main variable immediately

    streamInstance.on('finish', () => {
      console.log('[Stream Debug] Audio file stream finished writing.') // ADDED prefix
      console.log('[Stream Debug] Starting transcription via OpenAI API...') // ADDED prefix
      transcribeAudio(tempAudioFile) // Transcribe *after* stream is finished
      console.log('[Stream Debug] Called transcribeAudio function.') // ADDED
    })
    streamInstance.on('error', (err) => {
      console.error('[Stream Debug] Error writing audio file stream:', err) // ADDED prefix
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
}

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false, // Best practice for security
      contextIsolation: true, // Best practice for security
      nodeIntegration: true, // Temporarily enable for easier debugging if needed, but ideally keep false
    },
    show: true, // Make window visible
    // skipTaskbar: true, // Remove this to show in taskbar/dock
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
    image.setTemplateImage(true) // Explicitly mark as template image for macOS menu bar
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
      apiKey: '', // Add default for apiKey
      hotkey: 'CommandOrControl+Shift+Space',
      microphone: 'default',
      totalDurationSeconds: 0, // Added for cost tracking
    },
  })

  // Initialize OpenAI client after store is ready
  initializeOpenAIClient()

  // Initialize variables dependent on store
  currentHotkey = store.get('hotkey')

  // Now proceed with creating UI and registering shortcuts
  createTray()
  createWindow() // Create the main window but keep it hidden initially

  // --- Create Application Menu ---
  const menuTemplate = [
    // { role: 'appMenu' } // Use this for standard macOS app menu items
    ...(process.platform === 'darwin'
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              {
                label: 'Settings',
                accelerator: 'CmdOrCtrl+,', // Standard shortcut for settings
                click: () => {
                  if (mainWindow) {
                    mainWindow.show()
                  } else {
                    createWindow() // Create if it doesn't exist
                  }
                },
              },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),
    // { role: 'fileMenu' } // Use this for standard File menu items
    {
      label: 'File',
      submenu: [
        ...(process.platform !== 'darwin'
          ? [
              // Add Settings here for non-macOS
              {
                label: 'Settings',
                accelerator: 'CmdOrCtrl+,',
                click: () => {
                  if (mainWindow) {
                    mainWindow.show()
                  } else {
                    createWindow()
                  }
                },
              },
              { type: 'separator' },
            ]
          : []),
        process.platform === 'darwin' ? { role: 'close' } : { role: 'quit' },
      ],
    },
    // { role: 'editMenu' }
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(process.platform === 'darwin'
          ? [
              { role: 'pasteAndMatchStyle' },
              { role: 'delete' },
              { role: 'selectAll' },
              { type: 'separator' },
              {
                label: 'Speech',
                submenu: [{ role: 'startSpeaking' }, { role: 'stopSpeaking' }],
              },
            ]
          : [{ role: 'delete' }, { type: 'separator' }, { role: 'selectAll' }]),
      ],
    },
    // { role: 'viewMenu' }
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    // { role: 'windowMenu' }
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(process.platform === 'darwin'
          ? [
              { type: 'separator' },
              { role: 'front' },
              { type: 'separator' },
              { role: 'window' },
            ]
          : [{ role: 'close' }]),
      ],
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            const { shell } = require('electron')
            await shell.openExternal('https://electronjs.org') // Or your project's website
          },
        },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(menuTemplate)
  Menu.setApplicationMenu(menu)
  // --- End Application Menu ---

  // --- Refactored Recording Toggle Logic ---
  function toggleRecording() {
    if (isRecording) {
      // --- Stop Recording ---
      console.log('Manual stop requested.')
      stopRecordingAndTranscribe() // Call the refactored stop function

      // Close transcription window if it exists
      if (transcriptionWindow && !transcriptionWindow.isDestroyed()) {
        console.log('Closing transcription window.')
        // Send close signal first (optional, allows renderer to clean up)
        // transcriptionWindow.webContents.send('close-transcription-window');
        transcriptionWindow.close()
      }
      transcriptionWindow = null
    } else {
      // --- Start Recording ---
      console.log('Starting recording...')
      recordingStartTime = Date.now() // Record start time

      // Create and show the transcription window
      if (!transcriptionWindow || transcriptionWindow.isDestroyed()) {
        transcriptionWindow = new BrowserWindow({
          width: 300, // Small width
          height: 150, // Small height
          frame: false, // No window frame (title bar, etc.)
          alwaysOnTop: true, // Keep it visible
          skipTaskbar: true, // Don't show in taskbar/dock
          resizable: false,
          movable: true,
          show: false, // Don't show immediately
          webPreferences: {
            preload: path.join(__dirname, 'preload.js'), // Reuse the same preload
            nodeIntegration: false,
            contextIsolation: true,
          },
        })
        transcriptionWindow.loadFile('transcription.html')
        transcriptionWindow.on('closed', () => {
          transcriptionWindow = null // Clear reference on close
        })
        // Show after a short delay to allow loading
        transcriptionWindow.once('ready-to-show', () => {
          transcriptionWindow.show()
          // Optionally send initial message
          transcriptionWindow.webContents.send(
            'transcription-update',
            'Listening...'
          )
        })
      } else {
        // If window exists but was hidden, show it
        transcriptionWindow.show()
        transcriptionWindow.webContents.send(
          'transcription-update',
          'Listening...'
        )
      }

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
        recordProgram: 'rec', // Rely on PATH modification below
        silence: '1.0', // Seconds of silence to end recording (we stop manually)
      }
      // Add device ID if not 'default'
      if (micId !== 'default') {
        recordingOptions.device = micId
      }

      // --- Modify PATH for packaged app ---
      // Prepend Homebrew bin directory to PATH for the child process
      const originalPath = process.env.PATH
      const homebrewPath = '/opt/homebrew/bin'
      if (
        process.platform === 'darwin' &&
        !originalPath.includes(homebrewPath)
      ) {
        process.env.PATH = `${homebrewPath}:${originalPath}`
        console.log(`Temporarily modified PATH to include ${homebrewPath}`)
      }
      // --- End PATH modification ---

      try {
        recordingProcess = record.record(recordingOptions)
      } catch (recordError) {
        console.error('Error starting recording process:', recordError)
        isRecording = false
        // Restore original PATH if modified
        if (process.env.PATH !== originalPath) {
          process.env.PATH = originalPath
        }
        return // Stop if recording fails to start
      }

      // Restore original PATH after spawning (or on error)
      if (process.env.PATH !== originalPath) {
        process.env.PATH = originalPath
        console.log('Restored original PATH.')
      }

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

      // --- Start the 2-minute timer ---
      console.log('Starting 2-minute recording timer.')
      recordingTimerId = setTimeout(() => {
        console.log(
          'Maximum recording time (2 minutes) reached. Stopping automatically.'
        )
        stopRecordingAndTranscribe() // Call the refactored stop function
      }, 2 * 60 * 1000) // 2 minutes in milliseconds
    }
  }
  // --- End Refactored Recording Toggle Logic ---

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
      toggleRecording() // Call the refactored function
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
      apiKey: store.get('apiKey'), // Return saved API key
      hotkey: store.get('hotkey'),
      microphone: store.get('microphone'),
    }
  })

  // Handle request from renderer to set a new API key
  ipcMain.handle('set-api-key', async (event, newApiKey) => {
    try {
      console.log('Received new API key, saving to store...')
      store.set('apiKey', newApiKey)
      console.log('API Key saved. Re-initializing OpenAI client...')
      // Re-initialize the OpenAI client with the new key
      const initialized = initializeOpenAIClient()
      if (!initialized) {
        // Optionally notify renderer if initialization failed
        // mainWindow?.webContents.send('api-key-invalid');
        console.error('Failed to initialize OpenAI client with the new key.')
        // Consider how to handle this - maybe clear the stored key?
        // store.set('apiKey', ''); // Example: Clear invalid key
        return {
          success: false,
          error: 'Failed to initialize OpenAI client with new key.',
        }
      }
      return { success: true }
    } catch (error) {
      console.error('Error saving API key:', error)
      return { success: false, error: error.message }
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

  // Handle request for usage stats
  ipcMain.handle('get-usage-stats', async (event) => {
    const totalSeconds = store.get('totalDurationSeconds', 0)
    const totalMinutes = totalSeconds / 60
    const costPerMinute = 0.006 // OpenAI Whisper cost per minute in USD
    const estimatedCost = totalMinutes * costPerMinute
    return {
      totalSeconds: totalSeconds,
      estimatedCost: estimatedCost,
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

  // Handle manual start/stop requests from renderer
  ipcMain.on('start-recording', () => {
    console.log('Received start-recording request from renderer.')
    if (!isRecording) {
      toggleRecording() // Call the refactored function
    } else {
      console.log('Already recording, ignoring start request.')
    }
  })

  ipcMain.on('stop-recording', () => {
    console.log('Received stop-recording request from renderer.')
    if (isRecording) {
      toggleRecording() // Call the refactored function
    } else {
      console.log('Not recording, ignoring stop request.')
    }
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

// Keep the app in the dock for debugging
// if (process.platform === 'darwin') {
//   app.dock.hide()
// }

// Function to send logs to renderer
function sendLogToRenderer(level, ...args) {
  if (mainWindow && mainWindow.webContents) {
    const message = args
      .map((arg) =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
      )
      .join(' ')
    mainWindow.webContents.send(
      'log-message',
      `[${level.toUpperCase()}] ${message}`
    )
  }
}

// Redirect console logs to the renderer window
const originalConsoleLog = console.log
const originalConsoleWarn = console.warn
const originalConsoleError = console.error

console.log = (...args) => {
  originalConsoleLog.apply(console, args) // Keep logging to main process console
  sendLogToRenderer('log', ...args)
}
console.warn = (...args) => {
  originalConsoleWarn.apply(console, args)
  sendLogToRenderer('warn', ...args)
}
console.error = (...args) => {
  originalConsoleError.apply(console, args)
  sendLogToRenderer('error', ...args)
}
