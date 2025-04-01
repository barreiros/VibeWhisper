# System Patterns: Barreiros_SuperWhisper

_This file documents the system architecture, key technical decisions, design patterns used, and component relationships within the SuperWhisper application._

## Architecture: Electron Main/Renderer

SuperWhisper follows the standard Electron application architecture:

1.  **Main Process (`main.js`):**

    - Runs in a Node.js environment.
    - Has full access to system resources (filesystem, OS APIs).
    - Manages application lifecycle (startup, quit).
    - Creates and manages Renderer Processes (BrowserWindows).
    - Handles global application events (e.g., global hotkeys, system tray).
    - Orchestrates core logic: audio capture initiation, communication with OpenAI API (via helper functions or modules), triggering text pasting.
    - Responsible for Inter-Process Communication (IPC) with Renderer Processes.

2.  **Renderer Processes:**
    - Run in a Chromium environment (sandboxed).
    - Responsible for rendering the User Interface (HTML, CSS, JS).
    - Limited access to system resources; must communicate with the Main Process via IPC for privileged operations.
    - **Settings Window (`index.html`, `renderer.js`):** Displays configuration options, interacts with the user, and sends/receives settings data to/from the Main Process via `preload.js`. Styled with Tailwind CSS.
    - **Transcription Window (`transcription.html`, `transcriptionRenderer.js`):** A minimal, frameless window to display live transcription text received from the Main Process via IPC.

## Key Technical Decisions

- **Framework:** Electron chosen for cross-platform desktop application development using web technologies (HTML, CSS, JS).
- **Backend Logic:** Node.js (inherent in Electron's Main Process) for system interactions.
- **Speech-to-Text:** OpenAI API (cloud-based) selected for high accuracy, requiring an internet connection and API key. No local models are used.
- **Global Hotkey:** A library compatible with Electron (e.g., `electron-global-shortcut`) is used to register and listen for the user-defined hotkey system-wide.
- **Audio Capture:** A Node.js compatible library or system utility (like SoX, potentially wrapped) is used by the Main Process to record audio from the selected microphone.
- **UI Styling:** Tailwind CSS used for the Settings window UI for rapid development and utility-first styling. Requires a build step (`npm run build:css` or `watch:css`).
- **Text Pasting:** The Main Process uses Electron's `clipboard` module and potentially OS-specific automation tools (like `robotjs` or AppleScript/PowerShell commands if needed) to paste text into the active application.

## Design Patterns

- **Inter-Process Communication (IPC):** Electron's `ipcMain` and `ipcRenderer` modules (often bridged securely via a `preload.js` script using `contextBridge`) are essential for communication between the Main and Renderer processes. This is used for:
  - Sending settings from the Settings window to the Main process.
  - Loading settings from the Main process into the Settings window.
  - Sending live transcription text from the Main process to the Transcription window.
  - Triggering actions in the Main process from UI elements (e.g., initiating a test recording).
- **Event-Driven:** The application reacts to events like hotkey presses, IPC messages, API responses, and UI interactions.
- **Configuration Management:** Settings (API key, hotkey) are likely stored persistently (e.g., using `electron-store` or a simple JSON file managed by the Main process).

## Component Relationships

```mermaid
graph TD
    subgraph Main Process (main.js)
        A[App Lifecycle] --> B(Global Hotkey Listener);
        B --> C{Audio Capture};
        C --> D[OpenAI API Client];
        D --> E[Text Pasting Logic];
        F[IPC Main Handler] <--> C;
        F <--> D;
        F <--> E;
        G[Settings Storage] <--> F;
        H[System Tray] --> F;
        I[App Menu] --> F;
        J[Window Management] --> K([Settings Window]);
        J --> L([Transcription Window]);
    end

    subgraph Renderer - Settings (index.html, renderer.js, preload.js)
        K --> M{UI Elements};
        M --> N[IPC Renderer];
        N <--> F;
    end

    subgraph Renderer - Transcription (transcription.html, transcriptionRenderer.js, preload.js)
        L --> O{Transcription Display};
        O --> P[IPC Renderer];
        P <--> F;
    end

    D --> Q([OpenAI API]);
    C --> R([Microphone]);
    E --> S([Active Application Input]);

    style K fill:#f9f,stroke:#333,stroke-width:2px;
    style L fill:#ccf,stroke:#333,stroke-width:2px;
```

_This document should be updated as the architecture evolves or significant technical decisions change._
