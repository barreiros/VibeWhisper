# Progress: Barreiros_SuperWhisper

_This file documents what currently works, what is left to build, the overall status, and any known issues or bugs._

## What Works (as of 2025-04-02 - Transcription Window Focus Updated)

- **Application Structure:** Refactored Electron app structure using manager classes (`src/core/`) and ES Modules in the main process.
- **Settings UI:**
  - The settings window (`index.html`) renders and is styled with Tailwind CSS (`output.css`).
  - UI elements for API key, hotkey, microphone selection, input language selection, **transcription prompt input**, and cost estimation display exist visually.
  - Build process for CSS (`npm run build:css`, `watch:css`) is functional.
  - Development server (`npm run dev`) with auto-reload is functional.
- **Core Logic (Partial):**
  - Settings (API Key, Hotkey, Microphone, Language, **Transcription Prompt**, Usage Duration) are saved and loaded persistently using `electron-store` via `SettingsStore.js`.
  - IPC communication between renderer and main process is established for settings via `IpcHandler.js` and preload scripts.
  - Global hotkey registration (`HotkeyManager.js`) is implemented.
  - Audio recording (`AudioRecorder.js` using `node-record-lpcm16`) **now generates unique temporary filenames (`recording-*.wav`) for each session**.
  - Transcription service (`TranscriptionService.js`) communicates with OpenAI API, uses language/prompt settings, **queues concurrent requests using unique file paths, and pastes combined results**.
  - Text pasting (`@nut-tree-fork/nut-js`) is implemented.
  - Transcription window display and updates (`WindowManager.js`, `TranscriptionRenderer.js`) are functional. **The window now appears without stealing focus (`showInactive()`)**.
  - System tray (`TrayManager.js`) is functional.
  - Application menu (`AppManager.js`) is functional.
  - Console log redirection to settings window is implemented.
- **Installation:** `package.json` defines dependencies. `install.sh` might automate some setup.
- **Memory Bank:** Core documentation files are initialized and updated.

## What's Left to Build (Refinements & Testing)

- **Testing:**
  - **Concurrent Transcription Handling:** Thoroughly test the queuing mechanism by initiating multiple recordings rapidly. Verify combined output, order, handling of failures, **and correct creation/deletion of unique temporary audio files (`recording-*.wav`)**.
  - **Transcription Prompt:** Thorough testing of the transcription prompt feature. Verify it's passed to the API and influences results. Test with empty and non-empty prompts.
  - **Input Language:** Thorough testing of the input language feature across different languages and "Auto-Detect". Verify accuracy and edge cases.
  - **Transcription Window Focus:** Verify that the transcription window consistently appears without stealing focus from the active application.
- **Transcription Window Closure:** Consider adding a manual close button or mechanism to the transcription window (`transcription.html`) as it currently stays open.
- **Error Handling:** Continue improving error handling and user feedback (e.g., clearer messages for API errors, SoX not found, paste failures).
- **Microphone List:** Ensure dynamic population of the microphone list is robust.
- **Cost Estimation:** Verify the accuracy and display of the cost estimation.
- **Packaging/Distribution:** Configure and test application packaging using `electron-builder`.

## Current Status

- **Core Functionality Implemented:** The main workflow (hotkey -> record (unique file) -> transcribe (with language/prompt options, handling concurrency via queue) -> paste) is functional. Settings are persistent. UI elements are connected. ES Module conversion complete. Concurrent transcription handling (queuing + unique files) implemented. **Transcription window focus behavior updated.**
- **Refinement Needed:** Focus shifts to testing (concurrency, prompt, language, **window focus**), improving user experience (like transcription window closure), enhancing error handling, and preparing for distribution.
- **Documentation Updated:** Memory Bank reflects the current state including the new language, prompt, updated concurrency features, **and transcription window focus change**.

## Known Issues/Bugs (as of 2025-04-02 - Focus Change)

- Transcription window remains open after transcription completes (by design from previous request, but may need a close button).
- Error messages could be more user-friendly in some cases (e.g., API errors).
- Text pasting might require specific OS permissions (macOS Accessibility) which aren't explicitly prompted for yet.

_This file should be updated as features are completed, new tasks are identified, or bugs are discovered/fixed._
