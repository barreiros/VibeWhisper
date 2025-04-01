# Tech Context: Barreiros_SuperWhisper

_This file details the specific technologies used in the project, development setup requirements, technical constraints, and key dependencies._

## Core Technologies

- **Application Framework:** Electron (`electron` npm package) - Enables building desktop apps with web technologies.
- **Runtime:** Node.js (comes with Electron's Main process) - For backend logic, system access, and package management.
- **Frontend:** HTML, CSS, JavaScript - Standard web technologies for building the Renderer process UIs.
- **Speech-to-Text Service:** OpenAI API - External cloud service for transcription.
- **UI Styling (Settings):** Tailwind CSS (`tailwindcss` npm package) - Utility-first CSS framework. Requires PostCSS (`postcss`, `autoprefixer`) for processing.

## Key Dependencies (npm)

- `electron`: Core framework.
- `openai`: Official Node.js library for interacting with the OpenAI API.
- `electron-store`: Likely used or intended for persistent storage of settings (API key, hotkey).
- `electron-global-shortcut`: For registering system-wide hotkeys.
- `tailwindcss`, `postcss`, `autoprefixer`: For building the Tailwind CSS (`output.css` from `style.css`).
- `concurrently`: Used in `npm run dev` to run multiple commands (CSS watch + Electron).
- `electron-reload`: Used in `npm run dev` for automatic reloading during development.
- **Audio Recording:** The specific library isn't explicitly listed in `.clinerules` dependencies, but it mentions needing a utility like SoX or a Node.js library. This needs confirmation or implementation. `node-audiorecorder` or similar might be candidates.
- **Text Pasting:** May rely solely on Electron's `clipboard.writeText()`, but could potentially involve `robotjs` or OS-specific scripts if more complex interaction is needed.

## Development Setup

1.  **Prerequisites:**
    - Node.js and npm (Check versions compatible with Electron version specified in `package.json`).
    - Git (for version control).
    - An OpenAI API Key.
    - Potentially an audio recording utility like SoX if not using a pure Node.js library (`brew install sox` on macOS).
2.  **Installation:**
    - Clone the repository.
    - Run `npm install` (or potentially the `install.sh` script which might automate more).
3.  **Configuration:**
    - Set the OpenAI API key either via the Settings UI or as an environment variable (`OPENAI_API_KEY`).
4.  **Running:**
    - **Development:** `npm run dev` (Starts CSS watcher and Electron with auto-reload).
    - **Production-like:** `npm start` (Builds CSS once, runs Electron).
5.  **CSS:** Tailwind CSS requires a build step. `output.css` is generated from `style.css` using `tailwind.config.js` and `postcss.config.js`.

## Technical Constraints

- **Online Only:** Relies on the OpenAI API, so requires an active internet connection for transcription.
- **API Costs:** OpenAI API usage incurs costs based on the amount of audio processed.
- **Platform Dependencies:**
  - Global hotkey implementation might have OS-specific nuances.
  - Audio recording setup might differ slightly between OSes.
  - Text pasting might require OS-specific workarounds for some target applications.
- **Build Process:** Requires a CSS build step for Tailwind.
- **Security:** The OpenAI API key needs to be stored and handled securely. Using environment variables or secure storage (`electron-store`) is preferred over hardcoding. Preload scripts (`preload.js`) are crucial for secure IPC.

_This document should be updated when dependencies are added/removed, the build process changes, or significant technical constraints are identified._
