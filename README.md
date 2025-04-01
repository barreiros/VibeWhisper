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
  - (Model selection is handled by OpenAI API).

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
    - The script will check prerequisites and install Node.js dependencies (`npm install`).
3.  **Configure OpenAI API Key:**
    - This application requires an OpenAI API key to function.
    - Obtain your key from [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys).
    - Set the key as an environment variable named `OPENAI_API_KEY`. You can do this temporarily in your terminal session before running the app:
      ```bash
      export OPENAI_API_KEY='your-actual-api-key-here'
      ```
    - For a more permanent solution, add the `export` line to your shell's configuration file (e.g., `~/.zshrc`, `~/.bash_profile`, `~/.bashrc`) and restart your terminal or source the file.
4.  **Run the Application:**
    ```bash
    npm start
    ```
    _(Ensure the `OPENAI_API_KEY` environment variable is set in the terminal session where you run this command)._

## How to Use

1.  Ensure your `OPENAI_API_KEY` environment variable is set.
2.  Launch the application (`npm start`).
3.  A tray icon should appear. Right-click for Settings or Quit.
4.  (Optional) Open the Settings window to configure the hotkey and microphone if needed.
5.  Press the configured global hotkey to start recording (you might see console logs if running from the terminal).
6.  Speak clearly.
7.  Press the global hotkey again to stop recording.
8.  The application will send the audio to OpenAI for transcription and attempt to paste the resulting text into wherever your cursor is focused.

## TODO

- Add visual feedback for recording state (e.g., tray icon change).
- Improve error handling and user notifications (e.g., for API errors, network issues).
- Refine UI/UX for settings.
- Packaging for distribution.
- Consider adding API-related options (e.g., language selection if needed) to settings.
