// Removed app, path, fs, PlaySound imports related to sound playback

// SettingsStore instance is now passed in constructor

// --- Sound Player Setup ---
// Sound playback is now handled by the dedicated sound window via IPC
// --- End Sound Player Setup ---

export default class AudioRecorder {
  // Use export default
  constructor(transcriptionService, windowManager, settingsStore) {
    // Accept settingsStore instance
    this.transcriptionService = transcriptionService // To trigger transcription
    this.windowManager = windowManager // To show/hide transcription window and send IPC commands
    this.settingsStore = settingsStore // Store the instance
    this.isRecording = false
    // Removed recordingProcess, audioFileStream, currentAudioFilePath
    this.recordingTimerId = null
    this.recordingStartTime = null
    // Removed volume tracking properties
    // Removed ensureTempDir call

    console.log('AudioRecorder initialized (Web Audio API mode).')
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
    // Play start sound via sound window
    this.windowManager?.sendToSoundWindow('play-sound', 'start')
    this.recordingStartTime = Date.now() // Record start time

    // Show the transcription window and send initial state/text
    this.windowManager?.showTranscriptionWindow()
    this.windowManager?.sendToTranscriptionWindow(
      'recording-state-change',
      true
    ) // Send recording started state
    this.windowManager?.sendToTranscriptionWindow(
      'transcription-update',
      'Listening...'
    ) // Keep UI update

    this.isRecording = true
    // TODO: Update tray icon

    // Get selected microphone ID from settings
    const micId = this.settingsStore.get('microphone', 'default')

    // Send command to background window via WindowManager to start capture
    console.log(`AudioRecorder: Sending start command for device: ${micId}`)
    this.windowManager?.sendToBackgroundWindow('command-start-capture', micId)
    // Note: We don't get immediate confirmation here. Errors handled via 'audio-error' IPC.

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
      // Play stop sound as the time limit warning via sound window
      this.windowManager?.sendToSoundWindow('play-sound', 'stop')
      this.stopRecordingAndTranscribe() // Then stop normally
    }, maxDurationMs)
  }

  stopRecordingAndTranscribe() {
    if (!this.isRecording) {
      console.log('AudioRecorder: Stop requested, but not currently recording.')
      return // Already stopped or not started
    }

    console.log('AudioRecorder: Stopping recording...')
    // Play stop sound (manual or timer) via sound window
    this.windowManager?.sendToSoundWindow('play-sound', 'stop')
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

    // Send command to background window via WindowManager to stop capture
    console.log('AudioRecorder: Sending stop command.')
    this.windowManager?.sendToBackgroundWindow('command-stop-capture')

    // Transcription is now triggered by 'audio-data-complete' IPC message in IpcHandler
    // UI updates (closing window, changing state) are handled there or in TranscriptionService

    // Send recording stopped state to the transcription window immediately for UI feedback
    this.windowManager?.sendToTranscriptionWindow(
      'recording-state-change',
      false
    )
    // Note: The window might be closed shortly after by the 'audio-data-complete' handler
    // or the 'audio-error' handler in IpcHandler.

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

    // Don't call general cleanup here; specific file handled by TranscriptionService or locally on error/skip
    // this.cleanupTempFile()
    // Notify user? Update UI?
    this.windowManager?.sendToTranscriptionWindow(
      'transcription-update',
      'Error during recording.'
    )
    // Send recording stopped state *before* closing window on error
    this.windowManager?.sendToTranscriptionWindow(
      'recording-state-change',
      false
    )
    // Close window on recording error.
    this.windowManager?.closeTranscriptionWindow()
    // Removed handleRecordingError and cleanupSpecificFile methods
  }

  getIsRecording() {
    return this.isRecording
  }
}
// Default export is at the class declaration now
