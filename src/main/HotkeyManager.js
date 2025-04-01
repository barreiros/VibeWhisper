const { globalShortcut } = require('electron')
// SettingsStore instance is now passed in constructor

class HotkeyManager {
  constructor(settingsStore) {
    // Accept settingsStore instance
    this.settingsStore = settingsStore // Store the instance
    this.currentHotkey = null
    this.toggleCallback = null // Function to call when hotkey is pressed
    console.log('HotkeyManager initialized.')
  }

  // Set the callback function to execute when the hotkey is triggered
  setToggleCallback(callback) {
    this.toggleCallback = callback
    console.log('HotkeyManager: Toggle callback set.')
  }

  registerCurrentHotkey() {
    // Unregister any existing shortcut first
    this.unregisterAll()

    // Use the passed instance
    this.currentHotkey = this.settingsStore.get('hotkey')
    if (!this.currentHotkey) {
      console.error(
        'HotkeyManager: Hotkey is not defined in settings. Cannot register shortcut.'
      )
      // TODO: Notify user via settings window?
      return false // Indicate failure
    }

    if (!this.toggleCallback) {
      console.error(
        'HotkeyManager: Toggle callback not set. Cannot register shortcut.'
      )
      return false // Indicate failure
    }

    try {
      const ret = globalShortcut.register(this.currentHotkey, () => {
        console.log(
          `HotkeyManager: Global shortcut ${this.currentHotkey} pressed.`
        )
        if (this.toggleCallback) {
          this.toggleCallback()
        } else {
          console.warn(
            'HotkeyManager: Hotkey pressed but no toggle callback is set.'
          )
        }
      })

      if (!ret) {
        console.error(
          `HotkeyManager: Failed to register global shortcut: ${this.currentHotkey}. It might be already in use by another application.`
        )
        // TODO: Notify user via settings window? Send IPC message
        // Example: this.windowManager?.sendToSettingsWindow('shortcut-registration-failed', this.currentHotkey);
        return false // Indicate failure
      } else {
        console.log(
          `HotkeyManager: Global shortcut ${this.currentHotkey} registered successfully.`
        )
        return true // Indicate success
      }
    } catch (error) {
      console.error(
        `HotkeyManager: Error registering global shortcut ${this.currentHotkey}:`,
        error
      )
      return false // Indicate failure
    }
  }

  unregisterAll() {
    try {
      globalShortcut.unregisterAll()
      console.log('HotkeyManager: All global shortcuts unregistered.')
    } catch (error) {
      console.error('HotkeyManager: Error unregistering shortcuts:', error)
    }
    this.currentHotkey = null // Clear the stored hotkey as it's no longer registered by us
  }

  getCurrentHotkey() {
    // Use the passed instance
    return this.settingsStore.get('hotkey') // Always get the latest from store
  }
}

module.exports = HotkeyManager
