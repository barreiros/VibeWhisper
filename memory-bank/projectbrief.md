# Project Brief: Barreiros_SuperWhisper

_This file is the foundation document for the Memory Bank. It defines the core requirements, goals, and scope of the project, serving as the source of truth._

## Core Goal

To create a desktop application named SuperWhisper that:

1.  Captures audio from the user's microphone upon activation via a global hotkey.
2.  Transcribes the captured audio into text using the OpenAI Speech-to-Text API.
3.  Pastes the transcribed text into the currently active input field on the user's system.

## Key Features

- Background operation with minimal system resource usage.
- System tray icon for access to settings and quitting.
- Settings UI (Electron window) for configuring:
  - OpenAI API Key
  - Global Hotkey
  - Microphone Input Source
  - Viewing estimated API usage cost.
- A small, always-on-top window displaying live transcription during recording.
- Cross-platform compatibility (initial focus likely on macOS based on current environment).

## Non-Goals (Initially)

- Offline transcription capabilities.
- Advanced text editing features within the app.
- Support for multiple languages beyond the default for the OpenAI model.
- Complex user account management.

_This brief should be updated if the core project scope or goals change significantly._
