# Scriptorfi Editor

A transcription editor with advanced features for audio synchronization and text formatting.

## Features

### Text Editor
- Rich text editing with Quill.js
- Custom font sizing and styling
- Auto-suggestions for common transcription phrases
- Keyboard shortcuts for text formatting

### Audio Synchronization
- **Right-click context menu**: Right-click on any timestamp (e.g., "0:00:36.4 S2:") to open a context menu with "Play from here" option
- Navigate to specific timestamps in audio
- Visual feedback when timestamps are activated

### Text Formatting
- **Ctrl+U**: Convert selected text to UPPERCASE
- **Ctrl+G**: Convert selected text to Title Case
- **Alt+S**: Format selected text as spelling (e.g., "hello" → "H-E-L-L-O")

### Find and Replace
- Find and highlight text
- Replace text with case sensitivity options
- Replace all occurrences

### Speaker Management
- Swap speaker labels within selected text
- Replace speaker labels

### Monetization (Optional)
- **Adsterra Integration**: Built-in support for monetizing your deployment
- See [MONETIZATION.md](./MONETIZATION.md) for a complete 10-day strategy
- See [ADSTERRA_SETUP.md](./ADSTERRA_SETUP.md) for setup instructions

## Usage

### Playing Audio from Timestamps
1. Right-click on any timestamp in the format `HH:MM:SS.S S#:` (e.g., "0:00:36.4 S2:")
2. Select "Play from here" from the context menu
3. The audio will start playing from that timestamp

### Text Formatting
- Select any text in the editor
- Use keyboard shortcuts or toolbar buttons to apply formatting
- Formatting options include uppercase, title case, and spelling format

### Speaker Label Management
- Select text containing speaker labels
- Use the speaker management tools to swap or replace labels

## Development

This project is built with React and uses:
- Quill.js for rich text editing
- Tailwind CSS for styling
- Custom audio synchronization features

## Installation

```bash
npm install
npm start
```

The application will be available at `http://localhost:3000`.

## Monetization

To enable monetization through Adsterra ads:

1. See [ADSTERRA_SETUP.md](./ADSTERRA_SETUP.md) for detailed setup instructions
2. Copy `.env.example` to `.env.local` and add your Adsterra ad IDs
3. Set `REACT_APP_ADSTERRA_ENABLED=true`
4. Build and deploy

For a complete monetization strategy, see [MONETIZATION.md](./MONETIZATION.md).