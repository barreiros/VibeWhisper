document.addEventListener('DOMContentLoaded', () => {
  const modelSelect = document.getElementById('model-select')
  const hotkeyInput = document.getElementById('hotkey-input')
  const setHotkeyBtn = document.getElementById('set-hotkey-btn')
  const currentHotkeySpan = document.getElementById('current-hotkey')
  const micSelect = document.getElementById('mic-select')
  const statusMessage = document.getElementById('status-message')

  let capturingHotkey = false
  let newHotkey = ''

  // --- Model Selection ---
  modelSelect.addEventListener('change', (event) => {
    const selectedModel = event.target.value
    console.log(`Model selected: ${selectedModel}`)
    window.electronAPI.setModel(selectedModel) // Send to main process
    updateStatus(`Model setting saved: ${selectedModel}`)
  })

  // --- Hotkey Setting ---
  setHotkeyBtn.addEventListener('click', () => {
    capturingHotkey = true
    hotkeyInput.value = 'Press keys...'
    hotkeyInput.focus()
    updateStatus('Recording new hotkey...')
  })

  hotkeyInput.addEventListener('keydown', (event) => {
    if (!capturingHotkey) return

    event.preventDefault() // Prevent default key action
    const modifiers = []
    if (event.ctrlKey) modifiers.push('Control')
    if (event.altKey) modifiers.push('Alt')
    if (event.shiftKey) modifiers.push('Shift')
    if (event.metaKey) modifiers.push('Command') // Meta key is Command on macOS, Windows key on Windows

    // Use event.code for non-modifier keys to get physical key regardless of layout
    // Exclude modifier keys themselves from the main key part
    const key = event.code.startsWith('Key')
      ? event.code.substring(3)
      : event.code.startsWith('Digit')
      ? event.code.substring(5)
      : event.code === 'Space'
      ? 'Space'
      : event.code.startsWith('Arrow')
      ? event.code.substring(5) // Handle Arrows
      : event.code // Fallback for other keys like Enter, Tab, etc.

    if (!['Control', 'Alt', 'Shift', 'Meta', 'OS'].includes(key)) {
      // Don't register only modifiers
      newHotkey = [...modifiers, key].join('+')
      hotkeyInput.value = newHotkey
      capturingHotkey = false
      console.log(`Hotkey captured: ${newHotkey}`)
      // Send the new hotkey to the main process via preload script
      window.electronAPI.setHotkey(newHotkey).then((result) => {
        if (result.success) {
          currentHotkeySpan.textContent = newHotkey
          updateStatus(`Hotkey set to ${newHotkey}`)
          hotkeyInput.value = '' // Clear the input field after successful set
        } else {
          updateStatus(`Error setting hotkey: ${result.error}`)
          // Optionally revert UI or keep the failed input displayed
          hotkeyInput.value = '' // Clear input on failure
          // Reload the previously saved hotkey display
          window.electronAPI.getSettings().then((settings) => {
            currentHotkeySpan.textContent = settings.hotkey
          })
        }
      })
    }
  })

  hotkeyInput.addEventListener('blur', () => {
    // If user clicks away while capturing without pressing a valid combo
    if (capturingHotkey) {
      capturingHotkey = false
      hotkeyInput.value = '' // Clear the input
      updateStatus('Hotkey setting cancelled.')
    }
  })

  // --- Microphone Selection ---
  // TODO: Populate microphone list dynamically
  function populateMicrophones() {
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        micSelect.innerHTML =
          '<option value="default">Default System Input</option>' // Reset
        devices.forEach((device) => {
          if (device.kind === 'audioinput') {
            const option = document.createElement('option')
            option.value = device.deviceId
            option.text = device.label || `Microphone ${micSelect.length}`
            micSelect.appendChild(option)
          }
        })
        console.log('Microphone list populated.')
      })
      .catch((err) => {
        console.error('Error enumerating audio devices:', err)
        updateStatus('Error getting microphone list.')
      })
  }

  micSelect.addEventListener('change', (event) => {
    const selectedMicId = event.target.value
    const selectedMicLabel =
      event.target.options[event.target.selectedIndex].text
    console.log(
      `Microphone selected: ID=${selectedMicId}, Label=${selectedMicLabel}`
    )
    window.electronAPI.setMicrophone(selectedMicId) // Send to main process
    updateStatus(`Microphone setting saved: ${selectedMicLabel}`)
  })

  // --- Status Updates ---
  function updateStatus(message) {
    statusMessage.textContent = message
    console.log(`Status: ${message}`)
  }

  // --- Initialization ---
  console.log('Renderer script loaded.')
  updateStatus('Settings loaded.')
  // Request permission and populate microphones on load
  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((stream) => {
      populateMicrophones()
      // We don't need the stream itself here, just the permission grant
      stream.getTracks().forEach((track) => track.stop())
    })
    .catch((err) => {
      console.error('Error getting audio permissions:', err)
      updateStatus('Audio permission denied. Microphone selection unavailable.')
      // Still try to populate, might show default/limited options
      populateMicrophones()
    })

  // --- Load initial settings ---
  function loadInitialSettings() {
    window.electronAPI.getSettings().then((settings) => {
      console.log('Received settings from main:', settings)
      modelSelect.value = settings.model || 'base'
      currentHotkeySpan.textContent = settings.hotkey || 'Not Set'
      // We need to populate mics first, then select the saved one
      populateMicrophones() // Ensure mics are listed
      // Small delay to allow populateMicrophones to potentially finish
      setTimeout(() => {
        micSelect.value = settings.microphone || 'default'
        console.log(`Set microphone dropdown to: ${micSelect.value}`)
      }, 200) // Adjust delay if needed
      updateStatus('Settings loaded.')
    })
  }

  // --- Listen for events from Main ---
  window.electronAPI.on('shortcut-registration-failed', (failedHotkey) => {
    updateStatus(
      `Error: Failed to register hotkey "${failedHotkey}". It might be in use by another application.`
    )
    // Optionally reset the displayed hotkey to the last known good one
    window.electronAPI.getSettings().then((settings) => {
      currentHotkeySpan.textContent = settings.hotkey
    })
  })

  // --- Initial Load ---
  loadInitialSettings()
})
