// Note: electron-store will be imported dynamically via init()

class SettingsStore {
  constructor() {
    this.store = null // Will be initialized asynchronously
    console.log('SettingsStore instance created (pending init).')
  }

  // Asynchronous initialization method
  async init() {
    if (this.store) {
      console.log('SettingsStore already initialized.')
      return
    }
    try {
      const { default: Store } = await import('electron-store')
      // Use 'vibewhisper' as the project name for config storage
      this.store = new Store({
        name: 'vibewhisper-config', // Explicitly name the config file
        defaults: {
          apiKey: '',
          hotkey: 'CommandOrControl+Shift+Space',
          microphone: 'default',
          language: '', // Added language setting, default to Auto-Detect
          transcriptionPrompt: '', // Added transcription prompt setting
          totalDurationSeconds: 0,
        },
      })
      console.log('SettingsStore initialized successfully via dynamic import.')
      console.log('Default settings path:', this.store.path)
    } catch (error) {
      console.error(
        'Failed to dynamically import or initialize electron-store:',
        error
      )
      // Handle error appropriately - maybe throw or set a flag?
      throw error // Re-throw to indicate initialization failure
    }
  }

  // Helper to ensure store is initialized before use
  _ensureStoreInitialized() {
    if (!this.store) {
      throw new Error('SettingsStore not initialized. Call init() first.')
    }
  }

  get(key) {
    this._ensureStoreInitialized()
    return this.store.get(key)
  }

  set(key, value) {
    this._ensureStoreInitialized()
    this.store.set(key, value)
  }

  getAll() {
    this._ensureStoreInitialized()
    return {
      apiKey: this.get('apiKey'), // get() already checks initialization
      hotkey: this.get('hotkey'),
      microphone: this.get('microphone'),
      language: this.get('language'), // Added language to getAll
      transcriptionPrompt: this.get('transcriptionPrompt'), // Added prompt to getAll
      totalDurationSeconds: this.get('totalDurationSeconds'),
    }
  }

  getTotalDurationSeconds() {
    this._ensureStoreInitialized()
    return this.get('totalDurationSeconds') // get() already checks initialization
  }

  addDuration(seconds) {
    this._ensureStoreInitialized()
    const currentTotal = this.getTotalDurationSeconds() // get() checks init
    const newTotal = currentTotal + seconds
    this.set('totalDurationSeconds', newTotal) // set() checks init
    console.log(`Updated total duration: ${newTotal.toFixed(2)} seconds`)
    return newTotal
  }
}

// Export the class, not an instance, as initialization is now async
export default SettingsStore // Use export default
