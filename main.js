// This file is now just a stub to load the refactored main process code.
// All application logic has been moved to the src/main/ directory.

console.log('Loading main process from src/main/index.js...')

try {
  require('./src/main/index.js')
  console.log('Main process loaded successfully.')
} catch (error) {
  console.error('Failed to load main process:', error)
  // Optionally, use Electron's dialog to show the error if the app fails to start
  const { app, dialog } = require('electron')
  if (app) {
    app.whenReady().then(() => {
      dialog.showErrorBox(
        'Application Load Error',
        `Failed to load the main process. Please check the console logs.\n\n${
          error.stack || error
        }`
      )
      app.quit()
    })
  } else {
    // Fallback if app module isn't even available
    process.exit(1) // Exit with an error code
  }
}
