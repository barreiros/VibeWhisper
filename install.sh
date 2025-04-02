#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "Starting Barreiros SuperWhisper Installation..."
echo "=============================================="

# --- Check Prerequisites ---
echo ""
echo "Step 1: Checking prerequisites..."
echo "--------------------------------"

# Check for Node.js
if ! command -v node &> /dev/null
then
    echo "Error: Node.js is not installed. Please install it first (e.g., from https://nodejs.org/)."
    exit 1
else
    echo "- Node.js found: $(node --version)"
fi

# Check for npm
if ! command -v npm &> /dev/null
then
    echo "Error: npm is not installed. It usually comes with Node.js. Please ensure Node.js is installed correctly."
    exit 1
else
    echo "- npm found: $(npm --version)"
fi

# SoX check removed as it's no longer required (using Web Audio API)

echo "Prerequisites check finished."

# --- Install Dependencies ---
echo ""
echo "Step 2: Installing Node.js dependencies..."
echo "---------------------------------------"
echo "(This includes Electron, OpenAI client, Tailwind CSS, and other build tools)"
npm install
echo "Dependencies installed successfully."

# --- Final Instructions ---
# Steps 3 and 4 (local whisper build/download) removed as we are using OpenAI API
echo ""
echo "============================================"
echo " Installation Script Finished "
echo "============================================"
echo ""
echo "NEXT STEPS:"
echo "-----------"
echo ""
echo "1. Configure OpenAI API Key:"
echo "   - This application now uses the OpenAI API for transcription."
echo "   - You need to set the OPENAI_API_KEY environment variable."
echo "   - You can set it temporarily for the current session:"
echo "     export OPENAI_API_KEY='your-api-key-here'"
echo "   - Or add it to your shell profile (e.g., ~/.zshrc, ~/.bash_profile) for persistence."
echo "   - Get your API key from https://platform.openai.com/api-keys"
echo ""
echo "2. Run the Application:"
echo "   - Open your terminal in the project directory and run:"
echo "     npm start"
echo ""
echo "Setup complete."
