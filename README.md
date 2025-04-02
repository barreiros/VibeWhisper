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

## Installation & Setup

1.  **Download the Installer:**
    - Go to the [**Releases Page**](https://github.com/your-username/barreiros-superwhisper/releases) (Replace with your actual link).
    - Download the appropriate installer for your operating system (e.g., `.dmg` for macOS, `.exe` for Windows, `.AppImage` or `.deb`/`.rpm` for Linux).
2.  **Run the Installer:**
    - Double-click the downloaded file and follow the on-screen instructions to install the application.
3.  **Configure OpenAI API Key:**
    - Launch Barreiros SuperWhisper.
    - Open the **Settings** window (usually accessible from the system tray icon or the application menu).
    - Enter your OpenAI API key, which you can obtain from [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys). The key will be stored securely locally.

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
- Consider adding API-related options (e.g., language selection if needed) to settings.
- Add visual feedback for recording state (e.g., tray icon change, transcription window indicator).

## Development Setup

If you want to contribute or run the application from the source code:

1.  **Prerequisites:**
    - Node.js and npm installed.
    - Git installed.
2.  **Clone the Repository:**
    ```bash
    git clone https://github.com/your-username/barreiros-superwhisper.git # Replace with your actual repo URL
    cd barreiros-superwhisper
    ```
3.  **Install Dependencies:**
    ```bash
    npm install
    ```
4.  **Configure OpenAI API Key (Optional for Dev):**
    - You can create a `.env` file in the project root and add your key:
      ```
      OPENAI_API_KEY=your-api-key-here
      ```
    - Alternatively, set it in the Settings window after launching.
5.  **Run in Development Mode:**
    ```bash
    npm run dev
    ```
    - This starts the app with hot-reloading for code changes.
6.  **Build Installer Packages:**
    ```bash
    npm run build
    ```
    - This uses `electron-builder` to create installer packages in the `dist/` directory based on your current OS.
