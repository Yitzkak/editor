# Scriptorfi Editor - Copilot Instructions

## Project Overview

Scriptorfi Editor is a React-based transcription editor with advanced features for audio synchronization and text formatting. It's designed for professional transcription workflows, particularly legal depositions and interviews.

## Tech Stack

- **React** 18.3.1 - Main UI framework
- **Quill.js** 2.0.2 - Rich text editor
- **Tailwind CSS** 3.4.14 - Styling framework
- **WaveSurfer.js** / **Peaks.js** - Audio waveform visualization
- **Fuse.js** 7.1.0 - Fuzzy search for auto-suggestions
- **React Icons** - Icon library

## Project Structure

```
src/
├── components/
│   ├── AmplifyVolumeModal.js  # Volume amplification controls
│   ├── AudioPlayer.js          # Audio playback component
│   ├── FindReplaceModal.js     # Text find and replace
│   ├── KeyboardShortcutsModal.js # Keyboard shortcuts reference
│   ├── MediaPlayer.js          # Main media player with waveform
│   ├── SwapSpeakerModal.js     # Speaker label management
│   ├── TextEditor.js           # Basic Quill editor
│   ├── Textarea.js             # Main transcript editor with auto-suggestions
│   └── Toolbar.js              # Main toolbar with controls
├── App.js                      # Main application component
└── index.js                    # Application entry point
```

## Key Features

### 1. Audio Synchronization
- Right-click on timestamps (format: `HH:MM:SS.S S#:`) to play audio from that point
- Timestamps are clickable and trigger audio playback
- Waveform visualization for audio files (disabled for files >3 hours for performance)

### 2. Text Formatting
- **Ctrl+U**: Convert to UPPERCASE
- **Ctrl+G**: Convert to Title Case
- **Alt+S**: Spelling format (e.g., "hello" → "H-E-L-L-O")
- Right-Ctrl: Insert timestamp with speaker label

### 3. Auto-suggestions
- Fuzzy search-powered suggestions for common transcription phrases
- Predefined phrases include legal terms, formatting markers, and common responses
- Context-aware suggestions based on partial input

### 4. Speaker Management
- Speaker labels in format `S1:`, `S2:`, etc.
- Swap speaker labels functionality
- Replace speaker labels within selected text

## Coding Conventions

### React Components
- Use functional components with hooks (no class components)
- Use `forwardRef` when exposing component methods to parent
- Store Quill instances in refs, not state
- Use `useCallback` for event handlers passed to child components

### State Management
- Component-level state using `useState`
- Use refs for imperative APIs (Quill, media players)
- LocalStorage for persistence (notes, settings)

### Styling
- Use Tailwind CSS utility classes
- Primary font: Poppins (defined globally in tailwind.config.js)
- Monospace font: Source Code Pro for code/timestamps
- Consistent spacing and responsive design

### Event Handling
- Prevent default browser behaviors for custom shortcuts
- Use `useEffect` for setting up and cleaning up event listeners
- Handle keyboard shortcuts at the component level where they're relevant

### Audio/Media
- Use refs for media elements to access imperative APIs
- Handle audio context for Web Audio API features (amplification)
- Check for performance mode before rendering heavy visualizations

## Build and Test Commands

```bash
# Install dependencies
npm install

# Start development server (localhost:3000)
npm start

# Build for production
npm build

# Run tests
npm test
```

## Special Considerations

### Timestamp Format
- Standard format: `HH:MM:SS.S S#:` (e.g., "0:00:36.4 S2:")
- Hours can be 0-padded or not
- Speaker number follows the timestamp
- Context menu triggered by right-click on timestamps

### Performance
- Files >3 hours trigger performance mode (no waveform)
- Waveform rendering uses WaveSurfer.js or Peaks.js depending on requirements
- Large transcripts should be handled efficiently

### Auto-suggestions
- Fuse.js configured for fuzzy matching
- Suggestions appear below cursor position
- Arrow keys navigate, Tab/Enter to accept
- Common legal/transcription phrases predefined

### Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari)
- Uses Web Audio API (check for browser support)
- LocalStorage for data persistence

## Common Patterns

### Adding New Keyboard Shortcuts
1. Add to `KeyboardShortcutsModal.js` for documentation
2. Implement handler in relevant component (usually `Textarea.js`)
3. Use `e.preventDefault()` to avoid conflicts
4. Check for modifier keys (Ctrl, Alt, Shift)

### Working with Quill
- Access via ref: `quillInstanceRef.current`
- Get selection: `quill.getSelection()`
- Get/set content: `quill.getText()` / `quill.setText()`
- Format text: `quill.formatText(start, length, format, value)`

### Audio Playback
- Access media player via ref
- Use `currentTime` property to seek
- Handle loading states to prevent errors
- Check if media is loaded before operations

## Testing
- Uses React Testing Library and Jest
- Test files colocated with components (e.g., `App.test.js`)
- Focus on user interactions and accessibility
- Mock audio/media APIs in tests as needed
