# Barreiros SuperWhisper (OpenAI API Version)

A simple Electron application that runs in the background, listens for a global hotkey, records audio from the microphone, transcribes it using the **OpenAI Speech-to-Text API**, and pastes the resulting text into the active application.

## Features

- **Background Operation:** Runs unobtrusively with a system tray icon.
- **Global Hotkey:** Activate/deactivate recording with a configurable key combination (Default: `CmdOrCtrl+Shift+Space`).
- **Cloud Transcription:** Uses the OpenAI API for potentially higher accuracy transcription (requires internet connection and API key).
- **Automatic Pasting:** Transcribed text is automatically typed into the currently focused input field.
- **Configurable Settings:**
  - Global hotkey customization.
  - Microphone input source selection.
  - OpenAI API Key input.
  - Estimated API usage cost tracking.
- **Styling:** Uses Tailwind CSS for the settings interface.

## Setup & Running

1.  **Prerequisites:**
    - Node.js and npm installed.
    - A recording utility compatible with `node-record-lpcm16` (like `rec` from SoX, `arecord` on Linux). The install script attempts to install SoX on macOS via Homebrew if needed.
2.  **Run the Installation Script:**
    - The easiest way to set up dependencies is using the provided installation script. Open your terminal in the project directory and run:
      ```bash
      chmod +x install.sh # Make the script executable (only needed once)
      ./install.sh
      ```
    - The script will check prerequisites and install Node.js dependencies (`npm install`), including Tailwind CSS and its build tools.
3.  **Configure OpenAI API Key:**
    - This application requires an OpenAI API key to function.
    - Obtain your key from [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys).
    - You can set the key in the application's Settings window after launching it for the first time. The key will be stored securely locally.
    - Alternatively, you can still set the `OPENAI_API_KEY` environment variable, which will be used if no key is found in the settings.
4.  **Run the Application (Production):**
    ```bash
    npm start
    ```
    - This command first builds the necessary CSS using Tailwind (`npm run build:css`) and then launches the Electron application.
5.  **Run the Application (Development):**
    - For a better development experience with automatic reloading on file changes (JS, HTML, CSS), run:
      ```bash
      npm run dev
      ```
    - This uses `concurrently` to run the Tailwind CSS watcher and `electron-reload` alongside the Electron app. Changes to `main.js`, `renderer.js`, `*.html`, or `style.css` will trigger automatic rebuilds and application reloads.

## How to Use

1.  Launch the application (`npm start` or `npm run dev`).
2.  If launching for the first time or the API key isn't set, open the Settings window (via the Tray icon or the Application Menu: File -> Settings / AppName -> Settings) and enter your OpenAI API key.
3.  A tray icon should appear. Right-click for Settings or Quit.
4.  (Optional) Configure the hotkey and microphone in the Settings window. Check the estimated API usage cost.
5.  Press the configured global hotkey to start recording (you might see console logs if running from the terminal).
6.  Speak clearly.
7.  Press the global hotkey again to stop recording.
8.  The application will send the audio to OpenAI for transcription and attempt to paste the resulting text into wherever your cursor is focused.

## TODO

- Add visual feedback for recording state (e.g., tray icon change).
- Improve error handling and user notifications (e.g., for API errors, network issues).
- Refine UI/UX for settings (further Tailwind styling).
- Packaging for distribution.
- Consider adding API-related options (e.g., language selection if needed) to settings.
- Add visual feedback for recording state (e.g., tray icon change, transcription window indicator).
