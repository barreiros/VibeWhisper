const { contextBridge, ipcRenderer } = require('electron')

// Define the channels we expect to receive messages on from the main process
const validReceiveChannels = ['play-sound']

contextBridge.exposeInMainWorld('electronAPI', {
  // Renderer to Main (Not needed for sound playback, but good practice)
  // send: (channel, data) => {
  //     // whitelist channels
  //     let validChannels = [];
  //     if (validChannels.includes(channel)) {
  //         ipcRenderer.send(channel, data);
  //     }
  // },

  // Main to Renderer
  onPlaySound: (callback) => {
    if (validReceiveChannels.includes('play-sound')) {
      // Deliberately strip event as it includes `sender`
      ipcRenderer.on('play-sound', (event, ...args) => callback(...args))
    }
  },

  // Function to remove listener (good practice for cleanup)
  removePlaySoundListener: () => {
    ipcRenderer.removeAllListeners('play-sound')
  },
})

console.log('soundPreload.js loaded successfully.')
