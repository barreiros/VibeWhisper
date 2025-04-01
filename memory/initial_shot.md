# Project Summary: Barreiros SuperWhisper

**Objective:**
Create a desktop application using Electron that runs in the background. The application should listen for a global hotkey, record audio from the user's microphone, transcribe the audio locally using a Whisper model, and then automatically paste the transcribed text into the currently active input field.

**Key Technologies Used:**

- **Framework:** Electron
- **Language:** JavaScript (Node.js)
- **Core Dependencies:**
  - `electron`: For the desktop application shell.
  - `electron-store`: For managing and persisting user settings (hotkey, model, microphone).
  - `node-record-lpcm16`: For capturing audio from the microphone.
  - `whisper-node`: For performing local speech-to-text transcription using Whisper models.
  - `robotjs`: For simulating keyboard input to paste the transcribed text.

**Files Created:**

- `package.json`: Project manifest, dependencies, and scripts.
- `main.js`: Main Electron process logic (window management, tray icon, global shortcut, IPC handling, recording, transcription, pasting).
- `preload.js`: Secure bridge for communication between main and renderer processes.
- `index.html`: UI for the settings window.
- `style.css`: Basic styling for the settings window.
- `renderer.js`: Frontend JavaScript for the settings window (handling user input, communicating with main process).
- `.gitignore`: Standard Node.js/Electron gitignore file.
- `README.md`: Project description, setup instructions, and usage guide.

**Functionality Implemented:**

- Basic Electron application structure with a hidden main window and a system tray icon.
- Settings window (`index.html`) accessible via the tray icon, allowing configuration of:
  - Whisper model (dropdown).
  - Global hotkey (capture and display).
  - Microphone input device (dynamic population).
- Persistent storage of settings using `electron-store`.
- Registration and handling of a global hotkey (defined in settings, default `CmdOrCtrl+Shift+Space`) to toggle recording.
- Audio recording logic using `node-record-lpcm16`, saving to a temporary WAV file.
- Transcription logic using `whisper-node` triggered after recording stops.
- Automatic pasting of the transcription result using `robotjs`.
- IPC communication setup between the main and renderer processes for getting/setting configuration.

**Current Status:**
The foundational structure and core logic are complete. The application can be installed (`npm install`) and started (`npm start`). However, **transcription requires the user to manually download the appropriate Whisper GGML model file** (e.g., `ggml-base.bin`) and place it in the designated user data directory as specified in the `README.md`. The application includes placeholders and logging for model handling but does not yet automatically download models. Visual feedback for the recording state is also pending implementation.
