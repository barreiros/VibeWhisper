# Product Context: Barreiros_SuperWhisper

_This file describes why the project exists, the problems it solves, how it should ideally work from a user's perspective, and the desired user experience._

## Problem Solved

Users need a quick and seamless way to convert spoken thoughts or commands into text directly within their current application context (e.g., writing an email, filling a form, coding) without interrupting their workflow by switching to a dedicated dictation app or manually copying/pasting. Existing solutions might be too heavy, require manual activation/pasting, or lack integration with a powerful cloud-based transcription service like OpenAI's.

## How It Should Work (User Perspective)

1.  **Setup:** The user installs the app, enters their OpenAI API key in the settings, configures a global hotkey, and optionally selects their preferred microphone and input language for transcription.
2.  **Activation:** While working in any application, the user presses the configured global hotkey.
3.  **Recording:** A minimal, unobtrusive indicator (like the small transcription window) appears, showing that the app is listening. The user speaks.
4.  **Transcription:** The app sends the audio to OpenAI and displays the live transcription (or final result) in the indicator window.
5.  **Pasting:** Once the user stops speaking (or presses the hotkey again, TBD), the transcribed text is automatically pasted into the input field that had focus when the hotkey was initially pressed.
6.  **Deactivation:** The recording indicator disappears, and the app returns to its idle background state.
7.  **Access:** The user can access settings or quit the app via a system tray icon or application menu.

## User Experience Goals

- **Seamless:** The process from hotkey press to pasted text should feel fast and integrated into the user's existing workflow.
- **Unobtrusive:** The app should stay out of the way when not actively transcribing. The recording indicator should be minimal.
- **Accurate:** Leverage OpenAI's API for high-quality transcriptions.
- **Simple:** Easy to install, configure, and use with minimal learning curve.
- **Responsive:** Provide clear feedback during recording and transcription.
