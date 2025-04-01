# System Patterns: Barreiros_SuperWhisper

_This file documents the system architecture, key technical decisions, design patterns used, and component relationships within the SuperWhisper application._

## Architecture: Electron Main/Renderer (Refactored)

SuperWhisper follows the standard Electron application architecture, now refactored for better separation of concerns:

1.  **Main Process (`src/main/index.js` entry point):**

    - Runs in a Node.js environment with full system access.
    - Orchestrates the initialization and interaction of various manager classes responsible for specific functionalities.
    - The original `main.js` now acts only as a stub loader.
    - **Key Manager Classes:**
      - `AppManager.js`: Manages Electron app lifecycle events (ready, activate, quit) and the application menu.
      - `WindowManager.js`: Creates, manages, and provides access to `BrowserWindow` instances (Settings, Transcription). Handles window-specific events (close, hide).
      - `SettingsStore.js`: Wraps `electron-store` to provide a Singleton interface for persistent application settings (API key, hotkey, etc.).
      - `TrayManager.js`: Manages the system tray icon and its context menu (Settings, Quit).
      - `HotkeyManager.js`: Registers and handles the global hotkey, triggering a callback (currently `AudioRecorder.toggleRecording`).
      - `IpcHandler.js`: Centralizes all `ipcMain` listeners and handlers, routing communication between the main process and renderer processes. Redirects `console` output to the settings window.
      - `AudioRecorder.js`: Manages the audio recording process using `node-record-lpcm16`, including starting/stopping, handling the temporary audio file, and interacting with the `TranscriptionService`. Manages the transcription window's visibility during recording.
      - `TranscriptionService.js`: Handles communication with the OpenAI API for transcription, receives the audio file path from `AudioRecorder`, and uses `@nut-tree-fork/nut-js` to paste the resulting text into the active application. Updates the transcription window via `WindowManager`.

2.  **Renderer Processes:**
    - Run in a Chromium environment (sandboxed).
    - Responsible for rendering the User Interface (HTML, CSS, JS).
    - Limited access to system resources; communicate with the Main Process via dedicated preload scripts and IPC channels managed by `IpcHandler.js`.
    - **Settings Window (`index.html`, `renderer.js`):** Displays configuration options, interacts with the user, and communicates with the Main Process via `src/preload/settingsPreload.js`. Styled with Tailwind CSS.
    - **Transcription Window (`transcription.html`, `transcriptionRenderer.js`):** A minimal, frameless window to display live transcription text received from the Main Process via `src/preload/transcriptionPreload.js`.

## Key Technical Decisions

- **Framework:** Electron chosen for cross-platform desktop application development using web technologies (HTML, CSS, JS).
- **Backend Logic:** Node.js (inherent in Electron's Main Process) for system interactions.
- **Speech-to-Text:** OpenAI API (cloud-based) selected for high accuracy, requiring an internet connection and API key. No local models are used.
- **Global Hotkey:** A library compatible with Electron (e.g., `electron-global-shortcut`) is used to register and listen for the user-defined hotkey system-wide.
- **Audio Capture:** A Node.js compatible library or system utility (like SoX, potentially wrapped) is used by the Main Process to record audio from the selected microphone.
- **UI Styling:** Tailwind CSS used for the Settings window UI for rapid development and utility-first styling. Requires a build step (`npm run build:css` or `watch:css`).
- **Text Pasting:** The Main Process uses Electron's `clipboard` module and potentially OS-specific automation tools (like `robotjs` or AppleScript/PowerShell commands if needed) to paste text into the active application.

## Design Patterns

- **Inter-Process Communication (IPC):** Communication is strictly managed via `contextBridge` in dedicated preload scripts (`settingsPreload.js`, `transcriptionPreload.js`) and centralized handlers in `IpcHandler.js`. Whitelisted channels ensure secure communication for:
  - Getting/setting configuration (API key, hotkey, microphone).
  - Receiving status updates (logs, errors, transcription text).
  - Getting usage statistics.
- **Event-Driven:** The application reacts to events like hotkey presses (via `HotkeyManager`), IPC messages (via `IpcHandler`), app lifecycle events (via `AppManager`), and internal events between managers.
- **Configuration Management:** Settings are stored persistently using `electron-store`, managed via the `SettingsStore.js` Singleton.
- **Singleton Pattern:** Used for `SettingsStore.js` to ensure a single source of truth for configuration.
- **Dependency Injection (Manual):** Managers are instantiated in `src/main/index.js` and necessary dependencies (references to other managers) are passed during initialization or via dedicated setter methods (e.g., `setManagers`, `setToggleCallback`).

## Component Relationships (Refactored)

```mermaid
graph TD
    subgraph Main Process (src/main/)
        Entry[index.js] --> AppMan(AppManager);
        Entry --> WinMan(WindowManager);
        Entry --> Store(SettingsStore);
        Entry --> TrayMan(TrayManager);
        Entry --> HotkeyMan(HotkeyManager);
        Entry --> IPCHan(IpcHandler);
        Entry --> AudioRec(AudioRecorder);
        Entry --> TransSvc(TranscriptionService);
        Entry --> OpenAIClient{OpenAI Client Init};

        AppMan -- Manages --> AppEvents[App Lifecycle Events];
        AppMan -- Manages --> AppMenu[Application Menu];
        AppMan -- Uses --> WinMan;
        AppMan -- Uses --> HotkeyMan;
        AppMan -- Uses --> TrayMan;

        WinMan -- Creates/Manages --> SettingsWin([Settings Window]);
        WinMan -- Creates/Manages --> TransWin([Transcription Window]);
        WinMan -- Uses --> AppMan; # For isQuitting flag

        TrayMan -- Creates --> TrayIcon[System Tray Icon];
        TrayMan -- Uses --> WinMan; # To show settings

        HotkeyMan -- Registers --> GlobalShortcut[Global Hotkey];
        HotkeyMan -- Uses --> Store; # Get hotkey setting
        HotkeyMan -- Triggers --> AudioRec; # toggleRecording

        IPCHan -- Handles --> IPCMain[IPC Main Events];
        IPCHan -- Uses --> Store;
        IPCHan -- Uses --> HotkeyMan; # Re-register
        IPCHan -- Uses --> AppMan; # Re-init OpenAI
        IPCHan -- Uses --> WinMan; # Send messages to windows
        IPCHan -- Uses --> AudioRec; # Trigger manual start/stop

        AudioRec -- Records --> MicInput([Microphone Input]);
        AudioRec -- Creates --> TempFile[/tmp/temp_audio.wav];
        AudioRec -- Uses --> Store; # Get mic setting, add duration
        AudioRec -- Uses --> WinMan; # Show/Hide TransWin
        AudioRec -- Triggers --> TransSvc; # transcribeAudioFile

        TransSvc -- Uses --> OpenAIClient;
        TransSvc -- Reads --> TempFile;
        TransSvc -- Uses --> WinMan; # Update TransWin
        TransSvc -- Pastes via --> NutJS[nut-js Keyboard/Clipboard];
        TransSvc -- Deletes --> TempFile;

        OpenAIClient -- Communicates --> OpenAI_API([OpenAI API]);
        NutJS -- Interacts --> ActiveAppInput([Active Application Input]);
    end

    subgraph Renderer - Settings (index.html, renderer.js, settingsPreload.js)
        SettingsWin --> SettingsUI{UI Elements};
        SettingsUI -- Interacts via --> SettingsPreload[settingsPreload.js];
        SettingsPreload -- Communicates via --> IPCHan;
    end

    subgraph Renderer - Transcription (transcription.html, transcriptionRenderer.js, transcriptionPreload.js)
        TransWin --> TransUI{Transcription Display};
        TransUI -- Interacts via --> TransPreload[transcriptionPreload.js];
        TransPreload -- Communicates via --> IPCHan;
    end

    style SettingsWin fill:#f9f,stroke:#333,stroke-width:2px;
    style TransWin fill:#ccf,stroke:#333,stroke-width:2px;
```

_This document should be updated as the architecture evolves or significant technical decisions change._
