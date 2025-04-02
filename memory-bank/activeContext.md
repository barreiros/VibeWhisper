# Active Context: Barreiros_SuperWhisper

_This file tracks the current work focus, recent changes, immediate next steps, and active decisions or considerations. It bridges the gap between the broader context files and the day-to-day progress._

## Current Focus (2025-04-02 - ES Module Conversion)

- **ES Module Conversion:** Migrated main process code from CommonJS (`require`) to ES Modules (`import`/`export`).

## Recent Changes

- **ES Module Conversion (2025-04-02):**
  - Added `"type": "module"` to `package.json`.
  - Converted all `.js` files in `src/core/` (`App.js`, `AppManager.js`, `WindowManager.js`, `SettingsStore.js`, `TrayManager.js`, `HotkeyManager.js`, `IpcHandler.js`, `AudioRecorder.js`, `TranscriptionService.js`) to use `import`/`export` syntax.
  - Added `.js` extensions to relative imports within `src/core/`.
  - Implemented `__dirname` equivalents using `import.meta.url` where necessary (e.g., `WindowManager.js`, `App.js`).
  - Used `createRequire` in `App.js` to handle the CommonJS `electron-reload` dependency.
  - Preload scripts (`settingsPreload.js`, `transcriptionPreload.js`) and Renderer scripts (`Renderer.js`, `TranscriptionRenderer.js`) remain unchanged as they don't use CommonJS or are compatible.
- **Refactored Main Process (Prior - 2025-04-01):**
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

1.  **Test ES Module Conversion:** Run the application (`npm run dev` or `npm start`) to ensure the conversion to ES Modules works correctly. Verify:
    - Application starts without errors related to module loading (`ERR_MODULE_NOT_FOUND`, `ERR_REQUIRE_ESM`, etc.).
    - All previous functionalities (settings load/save, hotkey, recording, transcription, pasting, tray, menu, logging) still work as expected.
2.  **Await User Feedback/Next Task:** After testing, await further instructions.

## Active Decisions/Considerations

- **Module System:** The main process now uses ES Modules. This requires `.js` extensions in relative imports and careful handling of `__dirname`/`__filename` and potential CommonJS dependencies.
- **Transcription Window Closure:** Still relevant. Since the window remains open, adding a manual close button/mechanism to `transcription.html`/`TranscriptionRenderer.js` should be considered for user convenience.
- **Audio Recording Library:** Confirmed. `node-record-lpcm16` (requiring SoX) is implemented in `AudioRecorder.js`. PATH modification is included to help find `rec`.
- **Text Pasting Method:** Confirmed. `@nut-tree-fork/nut-js` is implemented in `TranscriptionService.js`. Potential OS permission requirements noted in `techContext.md`.
- **Hotkey Activation/Deactivation:** Implemented. `HotkeyManager` triggers `AudioRecorder.toggleRecording`. Recording stops on second press or after a 2-minute timer. Silence detection is not the primary stop mechanism.
- **Error Handling/User Feedback:** Refactoring provides better structure, but detailed error handling (e.g., SoX not found, API key invalid, paste failed) and clear user feedback in the UI (Settings/Transcription windows) needs ongoing review and improvement.
- **Renderer Updates:** Renderer scripts (`Renderer.js`, `TranscriptionRenderer.js`) were checked and did not require changes for the ES Module conversion itself, as they rely on the preload bridge.

_This file should be updated frequently, ideally after each significant work session or change in focus._
