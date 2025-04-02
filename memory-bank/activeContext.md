# Active Context: Barreiros_SuperWhisper

_This file tracks the current work focus, recent changes, immediate next steps, and active decisions or considerations. It bridges the gap between the broader context files and the day-to-day progress._

## Current Focus (2025-04-02 - Testing & 3D Visual)

- **Testing:** Focus on testing recent features (concurrent transcriptions, language/prompt settings, window focus) **and the new 3D transcription window visual**.
- **Refinements:** Address minor UX issues like transcription window closure.
- **Implement Cube Volume Reactivity:** Make the 3D cube's opacity react to microphone input volume.

## Recent Changes

- **Adjust Cube Smoothing (Slower/Progressive) (2025-04-02):**

  - Modified `src/core/CubeVisualizer.js`: Reduced `lerpFactor` from `0.3` back to `0.1` for slower, more progressive opacity and scale transitions, dampening abrupt volume changes.

- **Add Cube Scaling Effect (Volume-Based) (2025-04-02):**

  - Modified `src/core/CubeVisualizer.js`:
    - Added `targetScale` and `currentScale` state variables.
    - Updated `updateVolume` to calculate `targetScale` based on volume (mapping 0-1 to 0.8-1.2 range).
    - Updated `animate` loop to smoothly interpolate `currentScale` towards `targetScale` using `lerpFactor`.
    - Applied `currentScale` to the cube's `scale` property.

- **Adjust Cube Opacity Smoothing (Faster) (2025-04-02):**

  - Modified `src/core/CubeVisualizer.js`: Increased `lerpFactor` from `0.1` to `0.3` for faster opacity transitions.

- **Refine Cube Visuals (Smoothing & Color) (2025-04-02):**

  - Modified `src/core/CubeVisualizer.js`:
    - Changed base cube color to red (`0xff0000`).
    - Implemented opacity smoothing using `THREE.MathUtils.lerp` between `currentOpacity` and `targetOpacity` in the `animate` loop.
    - Added `targetOpacity` and `currentOpacity` state variables.
    - Updated `updateVolume` to set `targetOpacity`.
    - Updated `setRecordingState` to keep the color red.

- **Implement Cube Volume Reactivity (2025-04-02):**

  - Modified `src/core/AudioRecorder.js`:
    - Added logic to listen to the raw audio stream (`data` event).
    - Calculates RMS volume from audio chunks.
    - Normalizes volume to a 0-1 range (with tuning).
    - Sends normalized volume via a new IPC channel (`audio-volume-update`), throttled to avoid overwhelming the renderer.
  - Modified `src/preload/transcriptionPreload.js`:
    - Added `audio-volume-update` to `validReceiveChannels`.
    - Exposed `onAudioVolumeUpdate` helper via `contextBridge`.
  - Modified `src/core/TranscriptionRenderer.js`:
    - Added listener for `onAudioVolumeUpdate`.
    - Calls a new `updateVolume` method on the `CubeVisualizer` instance.
  - Modified `src/core/CubeVisualizer.js`:
    - Added `currentVolume` property.
    - Added `updateVolume(volumeLevel)` method to receive and store the normalized volume.
    - Modified the material to be transparent (`transparent: true`).
    - Modified the `animate` loop to update the cube material's `opacity` based on `currentVolume`, mapping it to a visible range (e.g., 0.1 to 1.0).

- **Replace Transcription Window Icon with 3D Cube (2025-04-02):**

  - Installed `three` npm package.
  - Modified `src/window/transcription.html`: Replaced the microphone indicator `div` with a `<canvas id="scene-canvas">`. Added styles for transparent background and canvas sizing.
  - Modified `src/core/TranscriptionRenderer.js`:
    - Imported `three`.
    - Implemented Three.js scene setup (scene, camera, lights).
    - Created a `WebGLRenderer` attached to the canvas with a transparent background (`alpha: true`).
    - Added a rotating grey cube (`BoxGeometry`, `MeshStandardMaterial`) to the scene.
    - Added an animation loop (`requestAnimationFrame`) to render the scene and rotate the cube.
    - Added window resize handling.
    - Removed code related to the old `mic-indicator` element. Kept IPC listeners for potential future use (e.g., changing cube color based on recording state).
  - **Refactored 3D Logic (2025-04-02):** Encapsulated the Three.js setup, animation loop, and resize handling within a `CubeVisualizer` class. **Moved `CubeVisualizer` class to its own file (`src/core/CubeVisualizer.js`)**. `src/core/TranscriptionRenderer.js` now imports and instantiates `CubeVisualizer`. **Reverted Three.js import (now within `CubeVisualizer.js`) back to dynamic `import()` due to renderer module resolution issues with static import.**

- **ES Module Conversion (2025-04-02):**
  - Added `"type": "module"` to `package.json`.
  - Converted all `.js` files in `src/core/` (`App.js`, `AppManager.js`, `WindowManager.js`, `SettingsStore.js`, `TrayManager.js`, `HotkeyManager.js`, `IpcHandler.js`, `AudioRecorder.js`, `TranscriptionService.js`) to use `import`/`export` syntax.
  - Added `.js` extensions to relative imports within `src/core/`.
  - Implemented `__dirname` equivalents using `import.meta.url` where necessary (e.g., `WindowManager.js`, `App.js`).
  - Used `createRequire` in `App.js` to handle the CommonJS `electron-reload` dependency.
  - Preload scripts (`settingsPreload.js`, `transcriptionPreload.js`) and Renderer scripts (`Renderer.js`, `TranscriptionRenderer.js`) remain unchanged as they don't use CommonJS or are compatible.
- **Add Input Language Setting (2025-04-02):**
  - Added language dropdown to `src/window/settings.html`.
  - Updated `src/core/Renderer.js` to load/save language setting via IPC.
  - Updated `src/preload/settingsPreload.js` to expose `setLanguage` IPC channel.
  - Updated `src/core/IpcHandler.js` to handle `set-language` IPC calls and save to `SettingsStore`.
  - Updated `src/core/SettingsStore.js` to include `language` in defaults and `getAll`.
  - Updated `src/core/TranscriptionService.js` to retrieve language setting and pass it to the OpenAI API call.
- **Add Transcription Prompt Setting (2025-04-02):**
  - Added prompt `textarea` and save button to `src/window/settings.html`.
  - Updated `src/core/Renderer.js` to load/save prompt setting via IPC.
  - Updated `src/preload/settingsPreload.js` to expose `setTranscriptionPrompt` IPC channel and helper.
  - Updated `src/core/IpcHandler.js` to handle `set-transcription-prompt` IPC calls and save to `SettingsStore`.
  - Updated `src/core/SettingsStore.js` to include `transcriptionPrompt` in defaults and `getAll`.
  - Updated `src/core/TranscriptionService.js` to retrieve prompt setting and pass it to the OpenAI API call if present.
- **Handle Concurrent Transcriptions (2025-04-02 - Updated):**
  - Modified `src/core/AudioRecorder.js` to:
    - Generate a unique temporary filename (using `randomUUID`) for each recording session (`recording-*.wav`).
    - Store the unique path in `currentAudioFilePath`.
    - Pass the specific unique path to `TranscriptionService.transcribeAudioFile`.
    - Implement `cleanupSpecificFile(filePath)` to delete the correct file upon completion/error within the recorder if needed (e.g., empty file).
  - Modified `src/core/TranscriptionService.js` to:
    - Add `activeRequests` counter and `transcriptionQueue` array.
    - Increment counter when `transcribeAudioFile` starts.
    - Add successful transcription results to the queue instead of pasting immediately.
    - Decrement counter in the `finally` block.
    - When the counter reaches zero, join all queued results, paste the combined text, and clear the queue.
    - Its existing `cleanupTempFile(filePath)` method correctly handles deleting the unique file path passed to it.
- **Prevent Transcription Window Focus Stealing (2025-04-02):**
  - Modified `src/core/WindowManager.js` (`createTranscriptionWindow`, `showTranscriptionWindow`) to use `showInactive()` instead of `show()` and removed `focus()` calls. This prevents the transcription window from taking focus when it appears.
- **Improve Transcription Window Transparency (2025-04-02):**
  - Added `hasShadow: false` to the `BrowserWindow` options in `src/core/WindowManager.js` for the transcription window to remove the native OS shadow, further enhancing transparency.
- **Adjust Cube Visuals (2025-04-02):**
  - Modified `src/core/CubeVisualizer.js` to increase the cube size (4x) and move the camera back (z=5) to prevent clipping. Removed dynamic positioning within the window; cube is now centered at (0,0,0).
- **Position Transcription Window (2025-04-02):**
  - Modified `src/core/WindowManager.js` to use the `screen` module to calculate the coordinates for the bottom-right corner of the primary display's work area.
  - Set the transcription window's position using `setPosition()` before showing it.
- **Refactored Main Process (Prior - 2025-04-01):**
  - Created manager classes: `AppManager`, `WindowManager`, `SettingsStore`, `TrayManager`, `HotkeyManager`, `IpcHandler`, `AudioRecorder`, `TranscriptionService` in `src/core/` (corrected path).
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

1.  **Test Concurrent Transcription Handling:** Run the application (`npm run dev` or `npm start`) and verify:
    - Start a recording, stop it, and immediately start a second recording before the first transcription completes.
    - Check console logs for `activeRequests` incrementing/decrementing and queue additions.
    - Verify that the final pasted text is the combination of both transcriptions, joined by a space.
    - Verify that temporary audio files (`recording-*.wav`) are correctly created and deleted from the temp directory (`app.getPath('temp')/barreiros-superwhisper-audio`).
    - Test cases with one or both transcriptions failing.
    - Test with more than two concurrent requests if possible.
2.  **Test Transcription Prompt Setting:** Run the application and verify the prompt functionality.
3.  **Test Input Language Setting:** Run the application and verify the language setting functionality.
4.  **Test Transcription Window Focus:** Verify the transcription window appears without stealing focus.
5.  **Test 3D Cube Volume Reactivity:** Run the application (`npm run dev` or `npm start`) and verify:
    - The transcription window displays a rotating grey cube.
    - The cube's **opacity changes** based on microphone input volume (louder = more opaque).
    - Check for visual glitches, performance impact (CPU/GPU usage), and appropriate **opacity and scale** range and **slower, more progressive smoothness**.
    - Verify the cube color remains red.
6.  **Update Memory Bank:** Update `progress.md`, `techContext.md`, and `systemPatterns.md`. (Updating now)
7.  **Await User Feedback/Next Task:** After documentation and testing, await further instructions.

## Active Decisions/Considerations

- **Module System:** The main process now uses ES Modules. This requires `.js` extensions in relative imports and careful handling of `__dirname`/`__filename` and potential CommonJS dependencies.
- **Transcription Window Closure:** Still relevant. Since the window remains open, adding a manual close button/mechanism to `transcription.html`/`TranscriptionRenderer.js` should be considered for user convenience.
- **Audio Recording Library:** Confirmed. `node-record-lpcm16` (requiring SoX) is implemented in `AudioRecorder.js`. PATH modification is included to help find `rec`.
- **Text Pasting Method:** Confirmed. `@nut-tree-fork/nut-js` is implemented in `TranscriptionService.js`. Potential OS permission requirements noted in `techContext.md`.
- **Hotkey Activation/Deactivation:** Implemented. `HotkeyManager` triggers `AudioRecorder.toggleRecording`. Recording stops on second press or after a 2-minute timer. Silence detection is not the primary stop mechanism.
- **Error Handling/User Feedback:** Refactoring provides better structure, but detailed error handling (e.g., SoX not found, API key invalid, paste failed) and clear user feedback in the UI (Settings/Transcription windows) needs ongoing review and improvement.
- **Renderer Updates:** Renderer scripts (`Renderer.js`, `TranscriptionRenderer.js`) were checked and did not require changes for the ES Module conversion itself, as they rely on the preload bridge.
- **Input Language Setting:** Added. Allows users to specify the input language for potentially better accuracy with OpenAI Whisper. Defaults to auto-detect.
- **Transcription Prompt Setting:** Added. Allows users to provide contextual prompts to the OpenAI Whisper API via the `prompt` parameter.
- **Concurrent Transcription Handling:** Implemented queuing mechanism in `TranscriptionService.js` and unique temporary file generation in `AudioRecorder.js` to handle overlapping requests correctly. Results are stored and combined before pasting.
- **Transcription Window Focus:** The transcription window is now configured to appear without stealing focus from the active application (`showInactive()`).
- **3D Cube Volume Reactivity:** Implemented and refined. The **red** cube's **opacity AND scale** now change **more slowly and progressively (smoothed with lerpFactor=0.1)** based on microphone input volume calculated in `AudioRecorder.js` and sent via IPC (`audio-volume-update`) to `CubeVisualizer.js`.
- **Removed Standard Menu Bar (2025-04-02):** Commented out `Menu.setApplicationMenu(menu)` in `src/core/AppManager.js` to remove the standard File/Edit/View etc. menu bar. Access to Settings and Quit is now solely through the system tray icon managed by `TrayManager.js`. The Dock icon remains visible on macOS.
- **Prevent Settings Window Auto-Show (2025-04-02):** Modified `src/core/WindowManager.js` to set `show: false` in the `BrowserWindow` options for the settings window, preventing it from opening automatically on application start. It now only opens when requested via the tray menu.
