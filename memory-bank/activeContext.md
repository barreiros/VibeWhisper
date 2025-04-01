# Active Context: Barreiros_SuperWhisper

_This file tracks the current work focus, recent changes, immediate next steps, and active decisions or considerations. It bridges the gap between the broader context files and the day-to-day progress._

## Current Focus (2025-04-01 - Refactoring Complete)

- **Main Process Refactoring:** Completed the refactoring of `main.js` into separate manager classes within the `src/main/` directory and split preload scripts.

## Recent Changes

- **Refactored Main Process (2025-04-01):**
  - Created manager classes: `AppManager`, `WindowManager`, `SettingsStore`, `TrayManager`, `HotkeyManager`, `IpcHandler`, `AudioRecorder`, `TranscriptionService` in `src/main/`.
  - Created new entry point `src/main/index.js`.
  - Updated `main.js` to be a stub loader.
  - Created separate preload scripts: `src/preload/settingsPreload.js` and `src/preload/transcriptionPreload.js`.
  - Updated `WindowManager.js` to use correct preload script paths.
  - Updated `package.json` main entry point and build files configuration.
  - Updated `systemPatterns.md` and `techContext.md` in Memory Bank.
- **Kept Transcription Window Open (Implicit in Refactor):** The logic in `AudioRecorder.js` does not close the transcription window after recording stops, maintaining the previous modification.
- **Modified `main.js` (Prior):** Commented out code to keep transcription window open (this change is now integrated into `AudioRecorder.js`).
- **Initialized Memory Bank (Prior):** Created core documentation files.
- **(Prior to Memory Bank Init):**

- UI for settings (`index.html`) has been styled using Tailwind CSS.
- Features related to API key input, hotkey setting, microphone selection, and cost estimation display were likely implemented or worked on recently (as indicated by `task_summary_20250401_tailwind_ui_features.md`).
- Build processes for Tailwind CSS (`build:css`, `watch:css`) are established.
- Development workflow using `npm run dev` (concurrently + electron-reload) is in place.

## Immediate Next Steps

1.  **Test Refactoring:** Run the application (`npm run dev` or `npm start`) to ensure the refactored code works as expected. Verify:
    - Application starts without errors.
    - Settings window opens and loads/saves settings correctly (API Key, Hotkey, Mic).
    - Tray icon appears and menu works.
    - Global hotkey registration works (check console logs for success/failure).
    - Recording starts/stops via hotkey.
    - Transcription window appears/updates/stays open.
    - Transcription occurs and text is pasted.
    - Debug controls (Start/Stop Recording buttons) function if wired up in `renderer.js`.
    - Logs appear in the settings window debug area.
2.  **Address Renderer Logic:** Review `renderer.js` and `transcriptionRenderer.js` to ensure they correctly use the new preload script APIs (`settingsPreload.js`, `transcriptionPreload.js`). Adjust if necessary.
3.  **Await User Feedback/Next Task:** After testing, await further instructions.

## Active Decisions/Considerations

- **Transcription Window Closure:** Still relevant. Since the window remains open, adding a manual close button/mechanism to `transcription.html`/`transcriptionRenderer.js` should be considered for user convenience.
- **Audio Recording Library:** Confirmed. `node-record-lpcm16` (requiring SoX) is implemented in `AudioRecorder.js`. PATH modification is included to help find `rec`.
- **Text Pasting Method:** Confirmed. `@nut-tree-fork/nut-js` is implemented in `TranscriptionService.js`. Potential OS permission requirements noted in `techContext.md`.
- **Hotkey Activation/Deactivation:** Implemented. `HotkeyManager` triggers `AudioRecorder.toggleRecording`. Recording stops on second press or after a 2-minute timer. Silence detection is not the primary stop mechanism.
- **Error Handling/User Feedback:** Refactoring provides better structure, but detailed error handling (e.g., SoX not found, API key invalid, paste failed) and clear user feedback in the UI (Settings/Transcription windows) needs ongoing review and improvement.
- **Renderer Updates:** `renderer.js` and `transcriptionRenderer.js` likely need updates to align with the new preload scripts.

_This file should be updated frequently, ideally after each significant work session or change in focus._
