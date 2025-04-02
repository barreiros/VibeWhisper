import fs from 'fs'
import OpenAI from 'openai' // Required for type checking if needed, client passed in
import { keyboard, Key, clipboard } from '@nut-tree-fork/nut-js'
// SettingsStore instance is now passed in constructor

export default class TranscriptionService {
  // Use export default
  constructor(windowManager, settingsStore) {
    // Accept settingsStore instance
    this.windowManager = windowManager // To update transcription window
    this.settingsStore = settingsStore // Store the instance
    this.openai = null // OpenAI client instance, set via setOpenAIClient
    console.log('TranscriptionService initialized.')
  }

  // Method to set the initialized OpenAI client
  setOpenAIClient(client) {
    this.openai = client
    console.log('TranscriptionService: OpenAI client set.')
  }

  async transcribeAudioFile(filePath) {
    console.log(
      `TranscriptionService: Received request to transcribe: ${filePath}`
    )

    // Check if the temp file still exists before transcribing
    if (!fs.existsSync(filePath)) {
      console.warn(
        `TranscriptionService: Transcription skipped: Temp audio file not found at ${filePath}`
      )
      return
    }

    // Check if OpenAI client is initialized (API Key exists and was valid)
    if (!this.openai) {
      console.error(
        'TranscriptionService: OpenAI client not initialized (API key likely missing or invalid). Cannot transcribe.'
      )
      this.windowManager?.sendToTranscriptionWindow(
        'transcription-update',
        'Error: OpenAI API Key missing or invalid.'
      )
      this.cleanupTempFile(filePath) // Clean up temp file
      return
    }

    console.log(
      `TranscriptionService: Attempting transcription via OpenAI API for: ${filePath}`
    )
    this.windowManager?.sendToTranscriptionWindow(
      'transcription-update',
      'Transcribing...'
    )

    try {
      const transcription = await this.openai.audio.transcriptions.create({
        file: fs.createReadStream(filePath), // Create a read stream from the file
        model: 'whisper-1', // Use the standard whisper-1 model
        // language: "es", // Optional: Specify language if known
        // response_format: "text" // Optional: Get plain text directly
      })

      console.log('TranscriptionService: OpenAI API response received.')
      const resultText = transcription?.text?.trim()
      console.log(
        'TranscriptionService: Received transcription text:',
        resultText ? `"${resultText}"` : resultText
      )

      if (resultText) {
        console.log('TranscriptionService: Transcription Result:', resultText)

        // Send final update to transcription window
        this.windowManager?.sendToTranscriptionWindow(
          'transcription-update',
          resultText
        )

        // Paste the text
        await this.pasteText(resultText)
      } else {
        console.log(
          'TranscriptionService: Transcription result from OpenAI was empty or in unexpected format.'
        )
        console.log(
          'TranscriptionService: Raw OpenAI response:',
          JSON.stringify(transcription)
        )
        this.windowManager?.sendToTranscriptionWindow(
          'transcription-update',
          'Transcription failed (empty result).'
        )
      }
    } catch (error) {
      console.error(
        'TranscriptionService: OpenAI API transcription failed:',
        error
      )
      let errorMessage = 'Transcription failed.'
      if (error.response) {
        console.error(
          'TranscriptionService: API Error Status:',
          error.response.status
        )
        console.error(
          'TranscriptionService: API Error Data:',
          error.response.data
        )
        errorMessage = `Transcription failed: ${
          error.response.data?.error?.message || error.response.status
        }`
      } else if (error.message) {
        errorMessage = `Transcription failed: ${error.message}`
      }
      this.windowManager?.sendToTranscriptionWindow(
        'transcription-update',
        errorMessage
      )
    } finally {
      // Clean up the temporary audio file regardless of success/failure
      this.cleanupTempFile(filePath)
      // Note: Window is kept open based on previous user request.
    }
  }

  async pasteText(text) {
    console.log('TranscriptionService: Pasting text...')
    try {
      console.log('[Paste Debug] Attempting to set clipboard content...')
      await clipboard.setContent(text)
      console.log('[Paste Debug] Clipboard content set (or attempted).')

      console.log('[Paste Debug] Simulating paste shortcut...')
      // Determine modifier key based on platform
      const modifierKey =
        process.platform === 'darwin' ? Key.LeftSuper : Key.LeftControl // Cmd on Mac, Ctrl elsewhere

      console.log(`[Paste Debug] Pressing modifier key: ${Key[modifierKey]}`)
      await keyboard.pressKey(modifierKey)
      console.log(`[Paste Debug] Pressing key: ${Key[Key.V]}`)
      await keyboard.pressKey(Key.V)
      console.log(`[Paste Debug] Releasing key: ${Key[Key.V]}`)
      await keyboard.releaseKey(Key.V)
      console.log(`[Paste Debug] Releasing modifier key: ${Key[modifierKey]}`)
      await keyboard.releaseKey(modifierKey)
      console.log('[Paste Debug] Paste shortcut simulation complete.')
      console.log('TranscriptionService: Text pasted successfully.')
    } catch (pasteError) {
      console.error(
        'TranscriptionService: Error during paste simulation:',
        pasteError
      )
      // Notify the user in the transcription window?
      this.windowManager?.sendToTranscriptionWindow(
        'transcription-update',
        'Pasting failed.'
      )
    }
  }

  cleanupTempFile(filePath) {
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath)
        console.log(
          `TranscriptionService: Deleted temporary audio file: ${filePath}`
        )
      } catch (unlinkErr) {
        console.error(
          `TranscriptionService: Error deleting temp audio file: ${unlinkErr}`
        )
      }
    } else {
      console.log(
        `TranscriptionService: Temp file already deleted or never existed: ${filePath}`
      )
    }
  }
}
// Default export is at the class declaration now
