const { app, BrowserWindow } = require('electron')
const path = require('path')
// SettingsStore instance is now passed in constructor
// We will import other managers later as needed

class AppManager {
  constructor(settingsStore) {
    // Accept settingsStore instance
    this.settingsStore = settingsStore // Store the instance
    this.mainWindow = null // Reference to the main settings window
    this.isQuitting = false // Flag to differentiate between close and quit
    // Other managers will be initialized and passed in or required later
    this.windowManager = null // To be set later
    this.trayManager = null // To be set later
    this.hotkeyManager = null // To be set later
    this.ipcHandler = null // To be set later
  }

  // Method to set references to other managers after they are created
  setManagers(managers) {
    this.windowManager = managers.windowManager
    this.trayManager = managers.trayManager
    this.hotkeyManager = managers.hotkeyManager
    this.ipcHandler = managers.ipcHandler
    // Add others as needed (AudioRecorder, TranscriptionService, etc.)
  }

  init() {
    this.setupAppListeners()
  }

  setupAppListeners() {
    // Quit when all windows are closed, except on macOS & when not quitting explicitly.
    app.on('window-all-closed', () => {
      // On macOS it is common for applications and their menu bar
      // to stay active until the user quits explicitly with Cmd + Q
      // We also want the app to stay in the tray, so we don't quit here.
      console.log('AppManager: window-all-closed event')
      // No automatic quitting - rely on Tray Quit or Cmd+Q
    })

    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      console.log('AppManager: activate event')
      if (this.windowManager) {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.windowManager.createSettingsWindow()
        } else {
          // If settings window exists but is hidden, show it
          const settingsWin = this.windowManager.getSettingsWindow()
          if (settingsWin && !settingsWin.isVisible()) {
            settingsWin.show()
          }
        }
      } else {
        console.error(
          'AppManager: WindowManager not available on activate event.'
        )
      }
    })

    // Handle the 'before-quit' event to set the flag
    app.on('before-quit', () => {
      console.log('AppManager: before-quit event')
      this.isQuitting = true
    })

    // Handle the 'will-quit' event for cleanup
    app.on('will-quit', () => {
      console.log('AppManager: will-quit event')
      // Unregister all shortcuts.
      if (this.hotkeyManager) {
        this.hotkeyManager.unregisterAll()
      } else {
        console.warn(
          'AppManager: HotkeyManager not available during will-quit.'
        )
      }
      // Perform any other cleanup
    })

    // This method will be called when Electron has finished
    // initialization and is ready to create browser windows.
    app.whenReady().then(async () => {
      console.log('AppManager: app is ready.')

      // Initialize other managers that depend on the app being ready
      // (Order might matter depending on dependencies)

      // Initialize SettingsStore (already done via singleton import)
      console.log('Settings loaded via SettingsStore.')

      // Initialize IPC Handlers
      if (this.ipcHandler) {
        this.ipcHandler.initialize() // Assuming an initialize method
      } else {
        console.error('AppManager: IpcHandler not set before app ready.')
      }

      // Initialize Hotkey Manager
      if (this.hotkeyManager) {
        this.hotkeyManager.registerCurrentHotkey() // Register initial hotkey
      } else {
        console.error('AppManager: HotkeyManager not set before app ready.')
      }

      // Create Tray Icon
      if (this.trayManager) {
        this.trayManager.createTray()
      } else {
        console.error('AppManager: TrayManager not set before app ready.')
      }

      // Create the main window (settings) - potentially hidden initially
      if (this.windowManager) {
        this.windowManager.createSettingsWindow()
        // Optionally hide it: this.windowManager.getSettingsWindow()?.hide();
      } else {
        console.error('AppManager: WindowManager not set before app ready.')
      }

      // Create Application Menu (moved here from main.js)
      this.createApplicationMenu()

      // Initialize OpenAI Client (moved to a dedicated service later)
      // For now, keep the logic from main.js but use SettingsStore
      this.initializeOpenAIClient()

      console.log('AppManager: Initialization complete.')
    })
  }

  // Placeholder for OpenAI initialization - will move to a service
  initializeOpenAIClient() {
    // Use the passed instance
    const apiKey =
      this.settingsStore.get('apiKey') || process.env.OPENAI_API_KEY
    if (apiKey) {
      try {
        // This should ideally be in a dedicated service/manager
        const OpenAI = require('openai')
        global.openai = new OpenAI({ apiKey }) // Store globally for now, refactor later
        console.log('AppManager: OpenAI client initialized successfully.')
        return true
      } catch (error) {
        console.error('AppManager: Failed to initialize OpenAI client:', error)
        global.openai = null
        return false
      }
    } else {
      console.error('AppManager: OpenAI API Key not found.')
      global.openai = null
      return false
    }
  }

  // Re-initialize OpenAI client, e.g., when API key changes
  reinitializeOpenAIClient() {
    console.log('AppManager: Re-initializing OpenAI client...')
    return this.initializeOpenAIClient()
  }

  createApplicationMenu() {
    const { Menu } = require('electron') // Import Menu here
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
                    this.windowManager?.showSettingsWindow()
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
                    this.windowManager?.showSettingsWindow()
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
                  submenu: [
                    { role: 'startSpeaking' },
                    { role: 'stopSpeaking' },
                  ],
                },
              ]
            : [
                { role: 'delete' },
                { type: 'separator' },
                { role: 'selectAll' },
              ]),
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
              await shell.openExternal(
                'https://github.com/barreiros/Barreiros_SuperWhisper'
              ) // Link to repo
            },
          },
        ],
      },
    ]

    const menu = Menu.buildFromTemplate(menuTemplate)
    Menu.setApplicationMenu(menu)
    console.log('AppManager: Application menu created.')
  }

  getIsQuitting() {
    return this.isQuitting
  }
}

module.exports = AppManager // Export the class
