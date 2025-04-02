import { app, Tray, Menu, nativeImage } from 'electron'
import path from 'path'

export default class TrayManager {
  // Use export default
  constructor(windowManager) {
    this.windowManager = windowManager // To show/create settings window
    this.tray = null
    console.log('TrayManager initialized.')
  }

  createTray() {
    if (this.tray) {
      console.log('TrayManager: Tray already exists.')
      return
    }

    // Use app.getAppPath() to get the correct base path, even in packaged apps
    const iconFileName = 'iconTemplate.png' // Keep filename simple
    const iconPath = path.join(app.getAppPath(), 'assets', iconFileName)
    console.log(`TrayManager: Attempting to load tray icon from: ${iconPath}`)

    try {
      const image = nativeImage.createFromPath(iconPath)
      if (image.isEmpty()) {
        throw new Error(
          `Created nativeImage from ${iconPath} is empty. Check file format/corruption.`
        )
      }
      // On macOS, setting template explicitly is important for dark/light mode compatibility
      if (process.platform === 'darwin') {
        image.setTemplateImage(true)
        console.log('TrayManager: Set image as template image for macOS.')
      }

      console.log('TrayManager: Creating Tray object...')
      this.tray = new Tray(image)
      console.log('TrayManager: Tray object created successfully.')

      const contextMenu = Menu.buildFromTemplate([
        {
          label: 'Settings',
          type: 'normal',
          click: () => {
            console.log('TrayManager: Settings menu item clicked.')
            // Use WindowManager to show/create the settings window
            this.windowManager.showSettingsWindow()
          },
        },
        {
          label: 'Quit',
          type: 'normal',
          click: () => {
            console.log('TrayManager: Quit menu item clicked.')
            app.quit() // Use app.quit() for proper shutdown sequence
          },
        },
      ])

      this.tray.setToolTip('Barreiros SuperWhisper')
      this.tray.setContextMenu(contextMenu)
      console.log('TrayManager: Tray tooltip and context menu set.')

      // Optional: Handle tray icon clicks (e.g., toggle settings window)
      this.tray.on('click', () => {
        console.log('TrayManager: Tray icon clicked.')
        // Example: Toggle settings window visibility
        // const settingsWin = this.windowManager.getSettingsWindow();
        // if (settingsWin) {
        //     settingsWin.isVisible() ? settingsWin.hide() : this.windowManager.showSettingsWindow();
        // } else {
        //     this.windowManager.showSettingsWindow();
        // }
      })

      console.log('TrayManager: Tray setup complete.')
    } catch (error) {
      console.error(
        `TrayManager: Failed to create tray icon from ${iconPath}.`,
        error
      )
      this.tray = null // Ensure tray is null if creation failed
      // Proceed without tray icon if it fails
    }
  }

  // Optional: Method to update tray icon (e.g., during recording)
  // updateIcon(iconFileName) {
  //     if (!this.tray) return;
  //     try {
  //         const iconPath = path.join(app.getAppPath(), 'assets', iconFileName);
  //         const image = nativeImage.createFromPath(iconPath);
  //         if (image.isEmpty()) throw new Error('New icon image is empty.');
  //         if (process.platform === 'darwin') image.setTemplateImage(true);
  //         this.tray.setImage(image);
  //         console.log(`TrayManager: Updated tray icon to ${iconFileName}`);
  //     } catch (error) {
  //         console.error(`TrayManager: Failed to update tray icon to ${iconFileName}.`, error);
  //     }
  // }

  destroyTray() {
    if (this.tray && !this.tray.isDestroyed()) {
      this.tray.destroy()
      console.log('TrayManager: Tray destroyed.')
    }
    this.tray = null
  }
}
// Default export is at the class declaration now
