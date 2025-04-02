// Removed app, fs, path imports related to debug saving
import OpenAI from 'openai' // Required for type checking if needed, client passed in
import { toFile } from 'openai' // Import the toFile helper
import { keyboard, Key, clipboard } from '@nut-tree-fork/nut-js'
// SettingsStore instance is now passed in constructor

export default class TranscriptionService {
  // Use export default
  constructor(windowManager, settingsStore) {
    // Accept settingsStore instance
    this.windowManager = windowManager // To update transcription window
    this.settingsStore = settingsStore // Store the instance
    this.openai = null // OpenAI client instance, set via setOpenAIClient
    this.activeRequests = 0 // Counter for ongoing transcription requests
    this.transcriptionQueue = [] // Queue to hold results while waiting for others
    console.log('TranscriptionService initialized.')
  }

  // Method to set the initialized OpenAI client
  setOpenAIClient(client) {
    this.openai = client
    console.log('TranscriptionService: OpenAI client set.')
  }

  // New method to handle audio buffer
  async transcribeAudioBuffer(audioBuffer, mimeType = 'audio/webm') {
    console.log(
      `TranscriptionService: Received request to transcribe buffer. Size: ${audioBuffer.length}, Type: ${mimeType}`
    )

    // Check if OpenAI client is initialized (API Key exists and was valid)
    if (!this.openai) {
      console.error(
        'TranscriptionService: OpenAI client not initialized (API key likely missing or invalid). Cannot transcribe.'
      )
      this.windowManager?.sendToTranscriptionWindow(
        'transcription-update',
        'Error: OpenAI API Key missing or invalid.'
      )
      // No file cleanup needed
      return
    }

    // Removed DEBUG code block

    console.log(
      `TranscriptionService: Attempting transcription via OpenAI API for buffer.`
    )
    this.windowManager?.sendToTranscriptionWindow(
      'transcription-update',
      'Transcribing...'
    )

    // Increment active requests counter
    this.activeRequests++
    console.log(
      `TranscriptionService: Active requests incremented to ${this.activeRequests}`
    )

    try {
      // Get the language and prompt settings
      const languageCode = this.settingsStore.get('language') // Get from store
      const promptText = this.settingsStore.get('transcriptionPrompt') // Get prompt from store
      console.log(
        `TranscriptionService: Using language setting: '${
          languageCode || 'Auto-Detect'
        }'`
      )
      if (promptText) {
        console.log(`TranscriptionService: Using prompt: "${promptText}"`)
      }

      // Prepare options for the API call
      // Determine a filename based on mimeType for the API
      const fileExtension = mimeType.split('/')[1]?.split(';')[0] || 'webm' // Extract basic extension
      const fileName = `audio.${fileExtension}`
      console.log(`TranscriptionService: Using filename for API: ${fileName}`)

      const transcriptionOptions = {
        file: await toFile(audioBuffer, fileName), // Use toFile helper
        model: 'whisper-1', // Use the standard whisper-1 model
        // response_format: "text" // Optional: Get plain text directly
      }

      // Add language only if it's set (not empty string)
      if (languageCode) {
        transcriptionOptions.language = languageCode
      }
      // Add prompt only if it's set (not empty string)
      if (promptText) {
        transcriptionOptions.prompt = promptText
      }

      const transcription = await this.openai.audio.transcriptions.create(
        transcriptionOptions
      )

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

        // Add the result to the queue instead of pasting immediately
        this.transcriptionQueue.push(resultText)
        console.log(
          `TranscriptionService: Added result to queue. Queue size: ${this.transcriptionQueue.length}`
        )

        // Update transcription window with intermediate status? (Optional - keeping simple for now)
        // this.windowManager?.sendToTranscriptionWindow('transcription-update', `Transcription ${this.transcriptionQueue.length}/${this.activeRequests} complete...`);
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
      // No file cleanup needed here

      // Decrement active requests counter
      this.activeRequests--
      console.log(
        `TranscriptionService: Active requests decremented to ${this.activeRequests}`
      )

      // Check if this was the last active request
      if (this.activeRequests === 0 && this.transcriptionQueue.length > 0) {
        console.log(
          'TranscriptionService: All requests finished. Processing queue.'
        )
        const combinedText = this.transcriptionQueue.join(' ').trim() // Join results with space
        this.transcriptionQueue = [] // Clear the queue

        if (combinedText) {
          console.log(
            'TranscriptionService: Pasting combined text:',
            combinedText
          )
          // Send final combined text to transcription window
          this.windowManager?.sendToTranscriptionWindow(
            'transcription-update',
            combinedText
          )
          // Paste the combined text
          await this.pasteText(combinedText)
        } else {
          console.log(
            'TranscriptionService: Combined text is empty, nothing to paste.'
          )
          // Update window if needed (e.g., show "Transcription complete" or clear?)
          // For now, it might still show the last error or "Transcribing..." if the last one failed.
          // Let's explicitly clear it or set a final state if nothing was pasted.
          this.windowManager?.sendToTranscriptionWindow(
            'transcription-update',
            'Transcription complete (no text).'
          )
        }
      } else if (this.activeRequests === 0) {
        // Handle case where the queue is empty (e.g., all requests failed)
        console.log(
          'TranscriptionService: All requests finished, but queue is empty (likely errors).'
        )
        // Update window to indicate completion without results
        this.windowManager?.sendToTranscriptionWindow(
          'transcription-update',
          'Transcription finished (no results).'
        )
      }
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
    } finally {
      // Close the transcription window after attempting to paste
      console.log(
        'TranscriptionService: Closing transcription window after paste attempt.'
      )
      this.windowManager?.closeTranscriptionWindow()
    }
  }

  // Removed transcribeAudioFile and cleanupTempFile methods
}
// Default export is at the class declaration now
