# Tech Context: Barreiros_SuperWhisper

_This file details the specific technologies used in the project, development setup requirements, technical constraints, and key dependencies._

## Core Technologies

- **Application Framework:** Electron (`electron` npm package) - Enables building desktop apps with web technologies.
- **Runtime:** Node.js (comes with Electron's Main process) - For backend logic, system access, and package management. **Main process uses ES Modules (`import`/`export`)**.
- **Frontend:** HTML, CSS, JavaScript - Standard web technologies for building the Renderer process UIs.
- **Speech-to-Text Service:** OpenAI API - External cloud service for transcription.
- **UI Styling (Settings):** Tailwind CSS (`tailwindcss` npm package) - Utility-first CSS framework. Requires PostCSS (`postcss`, `autoprefixer`) for processing.

## Key Dependencies (npm)

- `electron`: Core framework.
- `openai`: Official Node.js library for interacting with the OpenAI API.
- `electron-store`: Used for persistent storage of settings (API key, hotkey, microphone, usage duration), managed via `SettingsStore.js`.
- `electron-global-shortcut`: Used by `HotkeyManager.js` for registering system-wide hotkeys.
- `node-record-lpcm16`: Used by `AudioRecorder.js` for audio capture. Relies on SoX (`rec` command) being available in the system's PATH (PATH is temporarily modified during recording process startup to include common SoX locations like `/opt/homebrew/bin` and `/usr/local/bin`).
- `@nut-tree-fork/nut-js`: Used by `TranscriptionService.js` for simulating keyboard input (paste shortcut) and managing the clipboard.
- `dotenv`: Used to load environment variables (like a fallback `OPENAI_API_KEY`) from a `.env` file.
- `tailwindcss`, `postcss`, `autoprefixer`: For building the Tailwind CSS (`output.css` from `style.css`).
- `concurrently`: Used in `npm run dev` to run multiple commands (CSS watch + Electron).
- `electron-reload`: Used in `npm run dev` for automatic reloading during development (watches root directory now).

## Development Setup

1.  **Prerequisites:**
    - Node.js and npm (Check versions compatible with Electron version specified in `package.json`).
    - Git (for version control).
    - An OpenAI API Key.
    - An audio recording utility compatible with `node-record-lpcm16`, typically SoX (`brew install sox` on macOS, `apt-get install sox` on Debian/Ubuntu).
2.  **Installation:**
    - Clone the repository.
    - Run `npm install` (or potentially the `install.sh` script which might automate more, e.g., checking for SoX).
3.  **Configuration:**
    - Set the OpenAI API key via the Settings UI. A fallback can be set via an `OPENAI_API_KEY` environment variable (e.g., in a `.env` file).
    - Configure the desired global hotkey via the Settings UI.
    - Select the microphone input via the Settings UI.
4.  **Running:**
    - **Development:** `npm run dev` (Starts CSS watcher and Electron with auto-reload via `electron-reload`).
    - **Production-like:** `npm start` (Builds CSS once, runs Electron via the `src/core/App.js` entry point).
5.  **CSS:** Tailwind CSS requires a build step. `output.css` is generated from `style.css` using `tailwind.config.js` and `postcss.config.js`.

## Technical Constraints

- **Module System (Main Process):** Uses ES Modules (`"type": "module"` in `package.json`). This requires:
  - Using `import`/`export` syntax.
  - Including `.js` extensions in relative file imports (e.g., `import AppManager from './AppManager.js'`).
  - Using `import.meta.url`, `fileURLToPath`, and `dirname` to replicate `__dirname`/`__filename` functionality where needed.
  - Potentially using `createRequire` to import CommonJS modules if they don't support ESM directly (e.g., `electron-reload`).
- **Online Only:** Relies on the OpenAI API, so requires an active internet connection for transcription.
- **API Costs:** OpenAI API usage incurs costs based on the amount of audio processed.
- **Platform Dependencies:**
  - Global hotkey implementation might have OS-specific nuances.
  - Audio recording setup might differ slightly between OSes.
  - Text pasting via `@nut-tree-fork/nut-js` might require specific accessibility permissions depending on the OS (especially macOS).
- **Build Process:** Requires a CSS build step for Tailwind. `electron-builder` configuration in `package.json` needs to correctly include the `src/` directory and all necessary HTML/JS/CSS files.
- **Security:** The OpenAI API key is stored using `electron-store`. Communication between main and renderer processes is secured using `contextBridge` in dedicated preload scripts (`settingsPreload.js`, `transcriptionPreload.js`) with whitelisted IPC channels.

_This document should be updated when dependencies are added/removed, the build process changes, or significant technical constraints are identified._
