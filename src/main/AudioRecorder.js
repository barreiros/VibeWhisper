const { app } = require('electron')
const path = require('path')
const fs = require('fs')
const record = require('node-record-lpcm16')
// SettingsStore instance is now passed in constructor

// Use app's temp directory for temporary audio storage
const tempBaseDir = app.getPath('temp')
const tempAudioDir = path.join(tempBaseDir, 'barreiros-superwhisper-audio') // App-specific subfolder
const tempAudioFile = path.join(tempAudioDir, 'temp_audio.wav') // Temporary audio file path

class AudioRecorder {
  constructor(transcriptionService, windowManager, settingsStore) {
    // Accept settingsStore instance
    this.transcriptionService = transcriptionService // To trigger transcription
    this.windowManager = windowManager // To show/hide transcription window
    this.settingsStore = settingsStore // Store the instance
    this.isRecording = false
    this.recordingProcess = null
    this.audioFileStream = null
    this.recordingTimerId = null
    this.recordingStartTime = null

    this.ensureTempDir()
    console.log('AudioRecorder initialized.')
  }

  ensureTempDir() {
    try {
      if (!fs.existsSync(tempAudioDir)) {
        fs.mkdirSync(tempAudioDir, { recursive: true })
        console.log(
          `AudioRecorder: Created temporary audio directory: ${tempAudioDir}`
        )
      }
    } catch (error) {
      console.error(
        `AudioRecorder: Failed to create temporary audio directory at ${tempAudioDir}:`,
        error
      )
      // Consider disabling recording if the directory cannot be created
    }
  }

  toggleRecording() {
    if (this.isRecording) {
      this.stopRecordingAndTranscribe()
    } else {
      this.startRecording()
    }
  }

  startRecording() {
    if (this.isRecording) {
      console.log('AudioRecorder: Already recording.')
      return
    }
    console.log('AudioRecorder: Starting recording...')
    this.recordingStartTime = Date.now() // Record start time

    // Show the transcription window
    this.windowManager?.showTranscriptionWindow()
    this.windowManager?.sendToTranscriptionWindow(
      'transcription-update',
      'Listening...'
    )

    this.isRecording = true
    // TODO: Update tray icon (requires TrayManager reference or event emitter)
    // this.trayManager?.updateIcon('iconRecordingTemplate.png');

    // Ensure temp directory exists and delete previous temp file
    this.ensureTempDir()
    if (fs.existsSync(tempAudioFile)) {
      try {
        fs.unlinkSync(tempAudioFile)
        console.log(
          `AudioRecorder: Deleted previous temp audio file: ${tempAudioFile}`
        )
      } catch (err) {
        console.error(
          `AudioRecorder: Failed to delete previous temp audio file: ${err}`
        )
        // Decide if this is critical - maybe proceed anyway?
      }
    }

    // Create a write stream for the temporary audio file
    try {
      this.audioFileStream = fs.createWriteStream(tempAudioFile, {
        encoding: 'binary',
      })
      console.log(`AudioRecorder: Recording to: ${tempAudioFile}`)
    } catch (err) {
      console.error(
        `AudioRecorder: Failed to create write stream for temp audio file: ${err}`
      )
      this.isRecording = false // Reset recording state
      this.windowManager?.closeTranscriptionWindow() // Close window on error
      // TODO: Update tray icon back
      return // Stop if we can't write the file
    }

    // Start recording using node-record-lpcm16
    // Use the passed instance
    const micId = this.settingsStore.get('microphone', 'default') // Get selected mic ID
    const recordingOptions = {
      sampleRateHertz: 16000,
      channels: 1,
      threshold: 0.5, // Silence threshold
      verbose: false, // Set true for debugging
      recordProgram: 'rec', // Assumes 'rec' (SoX) is in PATH
      silence: '1.0', // Seconds of silence (though we stop manually/timer)
    }
    if (micId !== 'default') {
      recordingOptions.device = micId
    }

    // --- Modify PATH for packaged app (important for finding 'rec') ---
    const originalPath = process.env.PATH
    const homebrewPath = '/opt/homebrew/bin' // Common path on Apple Silicon Macs
    const usrLocalPath = '/usr/local/bin' // Common path on Intel Macs / Linux
    let pathModified = false

    if (process.platform === 'darwin' && !originalPath.includes(homebrewPath)) {
      process.env.PATH = `${homebrewPath}:${originalPath}`
      pathModified = true
      console.log(
        `AudioRecorder: Temporarily modified PATH to include ${homebrewPath}`
      )
    } else if (!originalPath.includes(usrLocalPath)) {
      // Also check /usr/local/bin, might be needed on Intel Macs or Linux if SoX installed there
      process.env.PATH = `${usrLocalPath}:${originalPath}`
      pathModified = true
      console.log(
        `AudioRecorder: Temporarily modified PATH to include ${usrLocalPath}`
      )
    }
    // --- End PATH modification ---

    try {
      this.recordingProcess = record.record(recordingOptions)
    } catch (recordError) {
      console.error(
        'AudioRecorder: Error starting recording process:',
        recordError
      )
      this.isRecording = false
      if (this.audioFileStream) this.audioFileStream.end() // Close stream if open
      this.audioFileStream = null
      this.windowManager?.closeTranscriptionWindow()
      // Restore original PATH if modified
      if (pathModified) {
        process.env.PATH = originalPath
        console.log('AudioRecorder: Restored original PATH after error.')
      }
      // TODO: Update tray icon back
      return // Stop if recording fails to start
    }

    // Restore original PATH immediately after spawning the process
    if (pathModified) {
      process.env.PATH = originalPath
      console.log('AudioRecorder: Restored original PATH after spawning.')
    }

    this.recordingProcess.stream().on('error', (err) => {
      console.error('AudioRecorder: Recording stream error:', err)
      this.handleRecordingError() // Centralize error handling
    })

    // Pipe the audio data to the file stream
    this.recordingProcess.stream().pipe(this.audioFileStream)

    // Start the maximum duration timer (e.g., 2 minutes)
    const maxDurationMs = 2 * 60 * 1000
    console.log(
      `AudioRecorder: Starting ${maxDurationMs / 1000}-second recording timer.`
    )
    this.recordingTimerId = setTimeout(() => {
      console.log(
        `AudioRecorder: Maximum recording time (${
          maxDurationMs / 1000
        }s) reached. Stopping automatically.`
      )
      this.stopRecordingAndTranscribe()
    }, maxDurationMs)
  }

  stopRecordingAndTranscribe() {
    if (!this.isRecording) {
      console.log('AudioRecorder: Stop requested, but not currently recording.')
      return // Already stopped or not started
    }

    console.log('AudioRecorder: Stopping recording...')
    const wasRecording = this.isRecording // Store state before changing
    this.isRecording = false // Set state immediately

    // Calculate duration
    let durationSeconds = 0
    if (this.recordingStartTime) {
      const endTime = Date.now()
      durationSeconds = (endTime - this.recordingStartTime) / 1000
      console.log(
        `AudioRecorder: Recorded duration: ${durationSeconds.toFixed(
          2
        )} seconds`
      )
      this.recordingStartTime = null // Reset start time
    } else {
      console.warn(
        'AudioRecorder: Could not determine recording duration: start time not recorded.'
      )
    }

    // Store cumulative duration using SettingsStore
    if (durationSeconds > 0) {
      // Use the passed instance
      this.settingsStore.addDuration(durationSeconds)
    }

    // Clear the automatic stop timer if it exists
    if (this.recordingTimerId) {
      clearTimeout(this.recordingTimerId)
      this.recordingTimerId = null
      console.log('AudioRecorder: Cleared automatic stop timer.')
    }

    // Stop the underlying recording process first
    if (this.recordingProcess) {
      try {
        this.recordingProcess.stop()
        console.log('AudioRecorder: Recording process stopped.')
      } catch (stopError) {
        console.error(
          'AudioRecorder: Error stopping recording process:',
          stopError
        )
      }
      this.recordingProcess = null
    } else {
      console.warn(
        'AudioRecorder: Recording process was null when trying to stop.'
      )
    }

    // Handle the file stream closure and trigger transcription
    if (this.audioFileStream) {
      console.log(
        'AudioRecorder: Setting up stream close handlers and ending stream...'
      )
      const streamInstance = this.audioFileStream
      this.audioFileStream = null // Nullify the main variable immediately

      streamInstance.on('finish', () => {
        console.log('AudioRecorder: Audio file stream finished writing.')
        // Check if the file actually exists and has size before transcribing
        try {
          const stats = fs.statSync(tempAudioFile)
          if (stats.size > 0) {
            console.log(
              `AudioRecorder: Temp file ${tempAudioFile} exists (${stats.size} bytes). Triggering transcription...`
            )
            this.transcriptionService?.transcribeAudioFile(tempAudioFile) // Trigger transcription
          } else {
            console.warn(
              `AudioRecorder: Temp file ${tempAudioFile} is empty. Skipping transcription.`
            )
            this.cleanupTempFile() // Clean up empty file
          }
        } catch (statError) {
          console.warn(
            `AudioRecorder: Could not stat temp file ${tempAudioFile} after stream finish. Skipping transcription. Error: ${statError.message}`
          )
          this.cleanupTempFile() // Clean up if stat fails
        }
        // Keep transcription window open as per recent change request
        // this.windowManager?.closeTranscriptionWindow();
      })
      streamInstance.on('error', (err) => {
        console.error('AudioRecorder: Error writing audio file stream:', err)
        this.cleanupTempFile() // Clean up temp file on stream error
        // Keep transcription window open? Or close? Let's keep it for now.
        // this.windowManager?.closeTranscriptionWindow();
      })

      // End the stream AFTER listeners are attached
      streamInstance.end()
      console.log('AudioRecorder: Called .end() on stream.')
    } else {
      console.warn(
        'AudioRecorder: Audio file stream was already null when stopping.'
      )
      // If stream is null, maybe the file is already closed or never opened?
      // Transcription won't happen. Ensure window is handled.
      // Keep transcription window open.
      // this.windowManager?.closeTranscriptionWindow();
    }

    // Update tray icon back if it was changed
    // TODO: Requires TrayManager reference or event emitter
    // if (wasRecording) {
    //     this.trayManager?.updateIcon('iconTemplate.png');
    // }
  }

  handleRecordingError() {
    console.error('AudioRecorder: An error occurred during recording.')
    this.isRecording = false
    this.recordingStartTime = null

    if (this.recordingTimerId) {
      clearTimeout(this.recordingTimerId)
      this.recordingTimerId = null
    }
    if (this.recordingProcess) {
      try {
        this.recordingProcess.stop()
      } catch (e) {}
      this.recordingProcess = null
    }
    if (this.audioFileStream) {
      try {
        this.audioFileStream.end()
      } catch (e) {}
      this.audioFileStream = null
    }

    this.cleanupTempFile()
    // Notify user? Update UI?
    this.windowManager?.sendToTranscriptionWindow(
      'transcription-update',
      'Error during recording.'
    )
    // Keep window open or close? Keep open for now.
    // this.windowManager?.closeTranscriptionWindow();
    // TODO: Update tray icon back
  }

  cleanupTempFile() {
    if (fs.existsSync(tempAudioFile)) {
      try {
        fs.unlinkSync(tempAudioFile)
        console.log(
          `AudioRecorder: Deleted temporary audio file: ${tempAudioFile}`
        )
      } catch (unlinkErr) {
        console.error(
          `AudioRecorder: Error deleting temp audio file: ${unlinkErr}`
        )
      }
    }
  }

  getIsRecording() {
    return this.isRecording
  }
}

module.exports = AudioRecorder
