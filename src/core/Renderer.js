document.addEventListener('DOMContentLoaded', () => {
  const modelSelect = document.getElementById('model-select')
  const hotkeyInput = document.getElementById('hotkey-input')
  const setHotkeyBtn = document.getElementById('set-hotkey-btn')
  const currentHotkeySpan = document.getElementById('current-hotkey')
  const micSelect = document.getElementById('mic-select')
  const languageSelect = document.getElementById('language-select') // Added language select element
  const statusMessage = document.getElementById('status-message')
  // API Key elements
  const apiKeyInput = document.getElementById('api-key-input')
  const setApiKeyBtn = document.getElementById('set-api-key-btn')
  // Debug UI elements
  const startBtn = document.getElementById('start-record-btn')
  const stopBtn = document.getElementById('stop-record-btn')
  const logOutput = document.getElementById('log-output')
  // Usage Stats elements
  const totalDurationSpan = document.getElementById('total-duration')
  const estimatedCostSpan = document.getElementById('estimated-cost')
  // Transcription Prompt elements
  const transcriptionPromptInput = document.getElementById(
    'transcription-prompt-input'
  )
  const setTranscriptionPromptBtn = document.getElementById(
    'set-transcription-prompt-btn'
  )
  // Accessibility elements
  const accessibilitySection = document.getElementById('accessibility-section')
  const accessibilityStatusSpan = document.getElementById(
    'accessibility-status'
  )
  const checkAccessibilityButton = document.getElementById(
    'check-accessibility-button'
  )
  const resetHotkeyBtn = document.getElementById('reset-hotkey-btn') // Added reset button
  // Microphone Permission elements
  const microphonePermissionSection = document.getElementById(
    'microphone-permission-section'
  )
  const microphoneStatusSpan = document.getElementById('microphone-status')

  let capturingHotkey = false
  let newHotkey = ''

  // --- API Key Setting ---
  setApiKeyBtn.addEventListener('click', () => {
    const newApiKey = apiKeyInput.value.trim()
    if (newApiKey) {
      console.log('Sending new API key to main process...')
      window.electronAPI.setApiKey(newApiKey).then((result) => {
        if (result.success) {
          updateStatus('API Key saved successfully.')
          // Optionally clear the input or provide visual feedback
          // apiKeyInput.value = ''; // Clear after saving
        } else {
          updateStatus(`Error saving API Key: ${result.error}`)
        }
      })
    } else {
      updateStatus('API Key cannot be empty.')
    }
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
    if (event.metaKey) modifiers.push('Cmd') // Use 'Cmd' for Electron accelerator string

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

  // Add listener for the reset button
  resetHotkeyBtn.addEventListener('click', () => {
    const defaultHotkey = 'CommandOrControl+Shift+Space'
    console.log(`Resetting hotkey to default: ${defaultHotkey}`)
    window.electronAPI.setHotkey(defaultHotkey).then((result) => {
      if (result.success) {
        currentHotkeySpan.textContent = defaultHotkey
        updateStatus(`Hotkey reset to default: ${defaultHotkey}`)
        hotkeyInput.value = '' // Clear the input field
      } else {
        updateStatus(`Error resetting hotkey: ${result.error}`)
        // Reload the previously saved hotkey display on failure
        window.electronAPI.getSettings().then((settings) => {
          currentHotkeySpan.textContent = settings.hotkey
        })
      }
    })
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

  // --- Language Selection ---
  languageSelect.addEventListener('change', (event) => {
    const selectedLanguage = event.target.value
    const selectedLanguageLabel =
      event.target.options[event.target.selectedIndex].text
    console.log(
      `Language selected: Code=${selectedLanguage}, Label=${selectedLanguageLabel}`
    )
    // Send to main process via preload script
    window.electronAPI.setLanguage(selectedLanguage).then((result) => {
      if (result.success) {
        updateStatus(`Input language saved: ${selectedLanguageLabel}`)
      } else {
        updateStatus(`Error saving language: ${result.error}`)
        // Optionally revert UI by reloading settings
        loadInitialSettings()
      }
    })
  })

  // --- Transcription Prompt Setting ---
  setTranscriptionPromptBtn.addEventListener('click', () => {
    const newPrompt = transcriptionPromptInput.value.trim()
    console.log('Sending new transcription prompt to main process...')
    // Send to main process via preload script
    window.electronAPI.setTranscriptionPrompt(newPrompt).then((result) => {
      if (result.success) {
        updateStatus('Transcription prompt saved successfully.')
      } else {
        updateStatus(`Error saving transcription prompt: ${result.error}`)
        // Optionally revert UI by reloading settings
        loadInitialSettings()
      }
    })
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
      // Removed modelSelect setting
      apiKeyInput.value = settings.apiKey || '' // Load API Key
      currentHotkeySpan.textContent = settings.hotkey || 'Not Set'
      // We need to populate mics first, then select the saved one
      populateMicrophones() // Ensure mics are listed
      // Small delay to allow populateMicrophones to potentially finish
      setTimeout(() => {
        micSelect.value = settings.microphone || 'default'
        micSelect.value = settings.microphone || 'default'
        console.log(`Set microphone dropdown to: ${micSelect.value}`)
      }, 200) // Adjust delay if needed
      languageSelect.value = settings.language || '' // Load language setting, default to '' (Auto-Detect)
      console.log(`Set language dropdown to: ${languageSelect.value}`)
      transcriptionPromptInput.value = settings.transcriptionPrompt || '' // Load prompt
      console.log(
        `Set transcription prompt input to: "${transcriptionPromptInput.value}"`
      )
      updateStatus('Settings loaded.')
    })
  }

  // --- Load Usage Stats ---
  function loadUsageStats() {
    window.electronAPI
      .getUsageStats()
      .then((stats) => {
        console.log('Received usage stats:', stats)
        if (totalDurationSpan) {
          totalDurationSpan.textContent = stats.totalSeconds.toFixed(2)
        }
        if (estimatedCostSpan) {
          // Format cost to a reasonable number of decimal places
          estimatedCostSpan.textContent = stats.estimatedCost.toFixed(4)
        }
      })
      .catch((err) => {
        console.error('Error fetching usage stats:', err)
        if (totalDurationSpan) totalDurationSpan.textContent = 'Error'
        if (estimatedCostSpan) estimatedCostSpan.textContent = 'Error'
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

  // --- Debug Controls ---
  startBtn.addEventListener('click', () => {
    console.log('Start Recording button clicked')
    window.electronAPI.startRecording()
    updateStatus('Manual start recording requested...')
  })

  stopBtn.addEventListener('click', () => {
    console.log('Stop Recording button clicked')
    window.electronAPI.stopRecording()
    updateStatus('Manual stop recording requested...')
  })

  // --- Log Handling ---
  window.electronAPI.on('log-message', (logMessage) => {
    // Append log message to the textarea
    logOutput.value += logMessage + '\n'
    // Scroll to the bottom
    logOutput.scrollTop = logOutput.scrollHeight
  })

  // --- Accessibility Check (macOS only) ---
  async function checkAccessibilityStatus() {
    if (!window.electronAPI || !window.electronAPI.checkAccessibility) return // Preload not ready

    try {
      const status = await window.electronAPI.checkAccessibility()
      console.log('Accessibility Status:', status)
      if (status.supported) {
        accessibilitySection.style.display = 'block' // Show the section
        if (status.enabled) {
          accessibilityStatusSpan.textContent = 'Status: Enabled'
          accessibilityStatusSpan.className =
            'text-sm font-medium text-green-600' // Green text
          checkAccessibilityButton.textContent = 'Check Status' // Change button text
        } else {
          accessibilityStatusSpan.textContent = 'Status: Disabled'
          accessibilityStatusSpan.className = 'text-sm font-medium text-red-600' // Red text
          checkAccessibilityButton.textContent = 'Request Access' // Keep button text
        }
      } else {
        accessibilitySection.style.display = 'none' // Hide on non-macOS
      }
    } catch (error) {
      console.error('Error checking accessibility status:', error)
      accessibilityStatusSpan.textContent = 'Status: Error'
      accessibilityStatusSpan.className = 'text-sm font-medium text-red-600'
      if (accessibilitySection) accessibilitySection.style.display = 'block' // Show section even on error if supported check failed
    }
  }

  async function requestAccessibilityPermission() {
    if (!window.electronAPI || !window.electronAPI.requestAccessibility) return

    try {
      accessibilityStatusSpan.textContent = 'Status: Requesting...'
      accessibilityStatusSpan.className = 'text-sm font-medium text-yellow-600'
      // Trigger the prompt (main process handles the OS dialog)
      await window.electronAPI.requestAccessibility()
      // The API doesn't wait for user interaction, so we re-check after a delay
      // to give the user time to respond to the OS prompt.
      updateStatus(
        'Accessibility permission requested. Please check the macOS prompt or System Settings.'
      )
      setTimeout(checkAccessibilityStatus, 2000) // Re-check status after 2 seconds
    } catch (error) {
      console.error('Error requesting accessibility permission:', error)
      updateStatus(`Error requesting accessibility: ${error.message}`)
      checkAccessibilityStatus() // Re-check status even on error
    }
  }

  if (checkAccessibilityButton) {
    checkAccessibilityButton.addEventListener(
      'click',
      requestAccessibilityPermission
    )
  }

  // --- Microphone Permission Check (macOS / Windows) ---
  async function checkMicrophonePermissionStatus() {
    if (!window.electronAPI || !window.electronAPI.checkMicrophonePermission)
      return // Preload not ready

    try {
      const result = await window.electronAPI.checkMicrophonePermission()
      console.log('Microphone Permission Status:', result)
      if (result.supported) {
        microphonePermissionSection.style.display = 'block' // Show section
        let statusText = 'Status: Unknown'
        let statusClass = 'text-sm font-medium text-gray-700' // Default color

        switch (result.status) {
          case 'granted':
            statusText = 'Status: Granted'
            statusClass = 'text-sm font-medium text-green-600' // Green
            break
          case 'denied':
            statusText = 'Status: Denied'
            statusClass = 'text-sm font-medium text-red-600' // Red
            break
          case 'restricted':
            statusText = 'Status: Restricted'
            statusClass = 'text-sm font-medium text-red-600' // Red
            break
          case 'not-determined':
            statusText = 'Status: Not Determined'
            statusClass = 'text-sm font-medium text-yellow-600' // Yellow
            break
          default:
            statusText = `Status: ${result.status || 'Unknown'}`
        }
        microphoneStatusSpan.textContent = statusText
        microphoneStatusSpan.className = statusClass
      } else {
        microphonePermissionSection.style.display = 'none' // Hide on unsupported OS
      }
    } catch (error) {
      console.error('Error checking microphone permission status:', error)
      microphoneStatusSpan.textContent = 'Status: Error'
      microphoneStatusSpan.className = 'text-sm font-medium text-red-600'
      if (microphonePermissionSection)
        microphonePermissionSection.style.display = 'block' // Show section even on error
    }
  }

  // --- Initial Load ---
  loadInitialSettings()
  loadUsageStats() // Load stats on initial load
  checkAccessibilityStatus() // Check accessibility status on load (for macOS)
  checkMicrophonePermissionStatus() // Check microphone status on load
})
