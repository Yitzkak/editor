import React, { useEffect, useState, useRef, useImperativeHandle, forwardRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import Fuse from 'fuse.js';

const predefinedWords = [
  'Objection, form.', 
  'Object to form', 
  '[overlapping conversation]', '[laughter]', '[pause]', '[chuckle]', 
  '[automated voice]', '[video playback]',
  '[background conversation]', '[foreign language]', '[vocalization]',
  // Add more common phrases for contextual suggestions
  'Let the record reflect',
  'Off the record',
  'Back on the record',
  'I don\'t recall',
  'I don\'t understand the question',
  'Can you repeat the question?',
  'Move to strike',
  'No further questions',
  'Redirect examination',
  'Cross-examination',
];

// Meta tag shortcuts - typing "[" + two letters auto-expands to full tag
const metaTagShortcuts = {
  'ov': '[overlapping conversation]',
  'la': '[laughter]',
  'pa': '[pause]',
  'ch': '[chuckle]',
  'au': '[automated voice]',
  'vi': '[video playback]',
  'ba': '[background conversation]',
  'fo': '[foreign language]',
  'vo': '[vocalization]',
};

const Textarea = forwardRef(({ fontSize, transcript, onTranscriptChange, onRequestSwapModal, autosuggestionEnabled, onRequestPlayRange, onRequestStop }, ref) => {
  const editorRef = useRef(null);
  const quillInstanceRef = useRef(null); // Store Quill instance here
  const [highlightedText, setHighlightedText] = useState('');
  const [selectionRange, setSelectionRange] = useState(null);
  const [suggestionPosition, setSuggestionPosition] = useState({ top: 0, left: 0 });

  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [currentInput, setCurrentInput] = useState('');

  // Notes panel state
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(() => {
    try {
      return localStorage.getItem('transcript_notes') || '';
    } catch (e) {
      return '';
    }
  });
  const [notesWidth, setNotesWidth] = useState(() => {
    try {
      const saved = parseInt(localStorage.getItem('transcript_notes_width'), 10);
      return Number.isFinite(saved) && saved > 0 ? saved : 320; // default 320px
    } catch (e) {
      return 320;
    }
  });
  const isResizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(320);

  const suggestionsRef = useRef(suggestions);
  const suggestionTriggerRef = useRef(false);
  const virtualCursorsRef = useRef([]);
  const cursorOverlayRef = useRef(null);
  const formattedRangesRef = useRef([]);
  const [timestampIndex, setTimestampIndex] = useState([]);
  const [onTimestampClick, setOnTimestampClick] = useState(null);
  const timestampHighlightsRef = useRef([]);
  const [invalidTimestampCount, setInvalidTimestampCount] = useState(0);
  const [currentInvalidIndex, setCurrentInvalidIndex] = useState(0);
  const timestampInvalidsRef = useRef([]);
  const [showInvalidList, setShowInvalidList] = useState(false);
  const [invalidPanelMaxHeight, setInvalidPanelMaxHeight] = useState(400);
  const [invalidPanelWidth, setInvalidPanelWidth] = useState(() => {
    try {
      const saved = parseInt(localStorage.getItem('invalid_panel_width'), 10);
      return Number.isFinite(saved) && saved > 120 ? saved : 320;
    } catch (e) {
      return 320;
    }
  });
  const isResizingInvalidRef = useRef(false);
  const startXInvalidRef = useRef(0);
  const startWidthInvalidRef = useRef(320);
  const validateTimerRef = useRef(null);
  const [validateTimestampsEnabled, setValidateTimestampsEnabled] = useState(false);

  // Context menu state
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    timestamp: null,
    clickIndex: 0,
    selectedText: '',
    showGoogle: false,
    showPlay: false,
    showSwapSpeaker: false,
    showSpeakerSnippets: false,
  });

  const contextMenuRef = useRef(null);

  const lastMenuOpenTimeRef = useRef(0);

  const inputPrefixRef = useRef('');

  const suggestionContextRef = useRef({ prefix: '', cursorIndex: 0 });

  // Add a ref for the suggestions popup
  const suggestionsBoxRef = useRef(null);

  // Speaker snippets state
  // Speaker names mapping: { S1: "Name", S2: "Name2", ... }
  const [speakerNames, setSpeakerNames] = useState(() => {
    try {
      const saved = localStorage.getItem('speaker_names');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });
  const [showSpeakerSnippets, setShowSpeakerSnippets] = useState(false);
  const [speakerSnippets, setSpeakerSnippets] = useState({}); // { S1: [{start,end,index}], ... }
  const [speakerOrder, setSpeakerOrder] = useState([]); // ["S1","S2",...]
  const [snippetCount, setSnippetCount] = useState(() => {
    try {
      const val = parseInt(localStorage.getItem('snippet_count'), 10);
      return Number.isFinite(val) && val > 0 ? val : 3;
    } catch (e) {
      return 3;
    }
  });
  const [snippetDuration, setSnippetDuration] = useState(() => {
    try {
      const val = parseFloat(localStorage.getItem('snippet_duration'), 10);
      return Number.isFinite(val) && val > 0 ? val : 3;
    } catch (e) {
      return 3;
    }
  });
  const [detectedSpeakerCount, setDetectedSpeakerCount] = useState(0);
  const [snippetsWidth, setSnippetsWidth] = useState(() => {
    try {
      const saved = parseInt(localStorage.getItem('transcript_snippets_width'), 10);
      return Number.isFinite(saved) && saved > 0 ? saved : 320; // default 320px
    } catch (e) {
      return 320;
    }
  });
  const isResizingSnippetsRef = useRef(false);
  const startXSnippetsRef = useRef(0);
  const startWidthSnippetsRef = useRef(320);

  // Add this state for speaker characteristics
  const [speakerCharacteristics, setSpeakerCharacteristics] = useState({}); // { S1: ["deep voice", ...], ... }

  // Find & Replace state
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceTextValue, setReplaceTextValue] = useState('');
  const [findResultCount, setFindResultCount] = useState(0);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(true);
  const [showHighlightRepeated, setShowHighlightRepeated] = useState(false);
  const repeatedPositionsRef = useRef([]); // stores { index, length }
  const [currentRepeatedIndex, setCurrentRepeatedIndex] = useState(0);
  const [replaceMode, setReplaceMode] = useState(null); // { selectedText, range } or null
  const replaceInputRef = useRef('');

  // Function to capitalize all letters
  const formatUppercase = () => {
    if (!quillInstanceRef.current) return;
  
    const range = quillInstanceRef.current.getSelection();
    if (range && range.length > 0) {
      const selectedText = quillInstanceRef.current.getText(range.index, range.length);
      const transformedText = selectedText.toUpperCase();
  
      quillInstanceRef.current.deleteText(range.index, range.length); 
      quillInstanceRef.current.insertText(range.index, transformedText);
    }
  };
  
  // Function to capitalize the first letter of each word
  const formatTitleCase = () => {
    if (!quillInstanceRef.current) return;

    // Save the current selection (cursor position)
    const currentSelection = quillInstanceRef.current.getSelection();

    // Get the entire transcript text
    const content = quillInstanceRef.current.getText();
    // Split into lines to handle multi-line transcript
    const lines = content.split(/(\r?\n)/);
    const transformedLines = lines.map(line => {
      if (/^\r?\n$/.test(line)) return line;
      let processed = line;
      // Capitalize after timestamp+speaker label
      processed = processed.replace(/((\d{1,2}:){2}\d{1,2}(?:\.\d+)?\s+S\d+:\s*)([a-zA-Z])/, (m, p1, _p2, p3) => {
        return p1 + p3.toUpperCase();
      });
      // Capitalize after . ? ! (sentence boundaries)
      processed = processed.replace(/([.!?]\s+)([a-zA-Z])/g, (m, p1, p2) => {
        return p1 + p2.toUpperCase();
      });
      // Capitalize first non-space character of the line
      processed = processed.replace(/(^\s*[a-zA-Z])/, m => {
        return m.toUpperCase();
      });
      return processed;
    });
    const transformedText = transformedLines.join("");
    quillInstanceRef.current.setText(transformedText);

    // Restore the previous selection (cursor position)
    if (currentSelection) {
      // Clamp the index to the new text length
      const newLength = quillInstanceRef.current.getLength();
      const index = Math.min(currentSelection.index, newLength - 1);
      quillInstanceRef.current.setSelection(index, currentSelection.length || 0);
    }
  };

  // Function to capitalize first letter of each word in current selection
  const formatSelectionTitleCase = () => {
    if (!quillInstanceRef.current) return;
    const range = quillInstanceRef.current.getSelection();
    if (!range || range.length === 0) return;
    const selectedText = quillInstanceRef.current.getText(range.index, range.length);
    const transformedText = selectedText.replace(/\b([a-zA-Z])/g, (m, p1) => p1.toUpperCase());
    quillInstanceRef.current.deleteText(range.index, range.length);
    quillInstanceRef.current.insertText(range.index, transformedText);
    quillInstanceRef.current.setSelection(range.index, transformedText.length);
  };

  // Function to format spellings
  const formatSpelling = () => {
    if (!quillInstanceRef.current) return;
  
    const range = quillInstanceRef.current.getSelection();
    if (range && range.length > 0) {
      const selectedText = quillInstanceRef.current.getText(range.index, range.length).trim();
  
      // Remove special characters except underscores, letters, and numbers
      const cleanedText = selectedText.replace(/[^a-zA-Z0-9_ ]/g, '');
  
      // Check if it's a single word (no spaces except between letters)
      const isSingleWord = cleanedText.split(' ').length === 1;
  
      // Format text with hyphens
      const formattedText = isSingleWord
        ? cleanedText.replace(/\s+/g, '').toUpperCase().split('').join('-') // Uppercase for single words
        : cleanedText.split(' ').map(word => word.split('').join('-')).join(' ').toUpperCase(); // Keep case for multiple words
  
      // Replace the selected text with formatted text
      quillInstanceRef.current.deleteText(range.index, range.length);
      quillInstanceRef.current.insertText(range.index, formattedText);
    }
  };

  const getWordsFromTranscript = () => {
    if (!quillInstanceRef.current) return { suggestions: [], displayToOriginal: {} };
    const content = quillInstanceRef.current.getText();
    // Extract all words (case-insensitive)
    const wordMatches = content.match(/\b\w+\b/g) || [];
    const freqMap = {};
    const originalCaseMap = {};
    wordMatches.forEach(word => {
      const lower = word.toLowerCase();
      freqMap[lower] = (freqMap[lower] || 0) + 1;
      // Store the first occurrence with original casing
      if (!originalCaseMap[lower]) originalCaseMap[lower] = word;
    });
    // Sort words by frequency, then alphabetically
    const sortedWords = Object.keys(freqMap)
      .sort((a, b) => freqMap[b] - freqMap[a] || a.localeCompare(b));
    // Use original case for display and insertion
    const displayToOriginal = {};
    const displayWords = sortedWords.map(w => {
      displayToOriginal[originalCaseMap[w]] = originalCaseMap[w];
      return originalCaseMap[w];
    });
    // Add predefinedWords (phrases) as-is
    predefinedWords.forEach(phrase => {
      displayToOriginal[phrase] = phrase;
    });
    const allSuggestions = [...predefinedWords, ...displayWords.filter(w => !predefinedWords.includes(w))];
    return { suggestions: allSuggestions, displayToOriginal };
  };

  const handleTextChange = () => {
    if (!quillInstanceRef.current) return;
    const quill = quillInstanceRef.current;
    const range = quill.getSelection();
    if (!range) return;
    // Only show suggestions if the user recently typed or pasted — avoid showing on mouse clicks
    if (!suggestionTriggerRef.current) {
      setSuggestions([]);
      setCurrentInput('');
      return;
    }
    const textBeforeCursor = quill.getText(0, range.index);
    
    // Check for meta tag shortcut expansion (e.g., "[ov" -> "[overlapping conversation]")
    const metaTagMatch = textBeforeCursor.match(/\[([a-z]{2})$/i);
    if (metaTagMatch) {
      const shortcut = metaTagMatch[1].toLowerCase();
      const expandedTag = metaTagShortcuts[shortcut];
      if (expandedTag) {
        // Auto-expand the shortcut
        const startIndex = range.index - 3; // Position of "["
        quill.deleteText(startIndex, 3); // Delete "[" + two letters
        quill.insertText(startIndex, expandedTag + ' ');
        quill.setSelection(startIndex + expandedTag.length + 1);
        setSuggestions([]);
        setCurrentInput('');
        return;
      }
    }
    
    // Use word boundary detection to find the current word being typed
    const match = textBeforeCursor.match(/\b\w*$/);
    const prefix = match ? match[0] : '';
    setCurrentInput(prefix);
    suggestionContextRef.current = { prefix, cursorIndex: range.index };
    let allSuggestions = [];
    let displayToOriginal = {};
    if (autosuggestionEnabled) {
      // Use both predefinedWords and transcript words
      const result = getWordsFromTranscript();
      allSuggestions = result.suggestions;
      displayToOriginal = result.displayToOriginal;
    } else {
      // Only use predefinedWords
      allSuggestions = predefinedWords;
      predefinedWords.forEach(phrase => {
        displayToOriginal[phrase] = phrase;
      });
    }
    if (prefix.length >= 3) {
      const fuse = new Fuse(allSuggestions, {
        includeScore: true,
        threshold: 0.4,
        minMatchCharLength: 2,
      });
      let results = fuse.search(prefix);
      let possibleSuggestions = Array.from(new Set(results.map(r => r.item)));
      // Filter out the current prefix from suggestions (case-insensitive)
      possibleSuggestions = possibleSuggestions.filter(s => s.toLowerCase() !== prefix.toLowerCase());
      setSuggestions(possibleSuggestions);
      handleTextChange.displayToOriginal = displayToOriginal;
      if (possibleSuggestions.length > 0) {
        const cursorBounds = quill.getBounds(range.index);
        setSuggestionPosition({ top: cursorBounds.top + 30, left: cursorBounds.left });
      }
    } else {
      setSuggestions([]);
    }
  };

  const insertSuggestionAtContext = (word) => {
    if (!quillInstanceRef.current) return;
    const quill = quillInstanceRef.current;
    quill.focus();
    const { prefix, cursorIndex } = suggestionContextRef.current;
    const displayToOriginal = handleTextChange.displayToOriginal || {};
    const originalWord = displayToOriginal[word] || word;
    let startIndex = cursorIndex - prefix.length;
    let deleteLength = prefix.length;
    // If the suggestion starts with [ and the prefix also starts with [, avoid double bracket
    if (originalWord.startsWith('[') && prefix.startsWith('[')) {
      startIndex += 1;
      deleteLength -= 1;
    }
    if (deleteLength > 0) {
      quill.deleteText(startIndex, deleteLength);
    }
    quill.insertText(startIndex, originalWord + ' ');
    quill.setSelection(startIndex + originalWord.length + 1);
    setSuggestions([]);
    setCurrentInput('');
    return false;
  };

  // Function to insert a timestamp
  // Insert a timestamp. If `speakerNumber` is provided, use it for the S# label when inserting at paragraph start.
  const insertTimestamp = (timestamp, speakerNumber = null) => {
    if (!quillInstanceRef.current) return;

    // Get the current selection
    const range = quillInstanceRef.current.getSelection();
    if (range) {
        // Check if it's the start of a paragraph
        const isStartOfParagraph = range.index === 0 || quillInstanceRef.current.getText(range.index - 1, 1) === "\n";
        const speakerLabel = speakerNumber ? `S${speakerNumber}` : 'S1';
        const formattedTimestamp = isStartOfParagraph ? `${timestamp} ${speakerLabel}: ` : `[${timestamp}] ____ `;

        // Insert the timestamp at the selection index
        quillInstanceRef.current.insertText(range.index, formattedTimestamp, 'user');

        if (isStartOfParagraph) {
          // Highlight the speaker number (right after "S") for paragraph start timestamps
          const highlightStart = range.index + timestamp.length + 2; // Position of the number after "S"
          quillInstanceRef.current.setSelection(highlightStart, 1); // Select just the digit
        } else {
          // Position cursor after the underscores for blank timestamps
          const cursorPos = range.index + formattedTimestamp.length;
          quillInstanceRef.current.setSelection(cursorPos);
        }
        // Validation removed - user must click button to validate
    }
  };

  // Force insertion of a proper timestamp regardless of cursor location (always use `${timestamp} S#:`)
  const insertTimestampForced = (timestamp, speakerNumber = 1) => {
    if (!quillInstanceRef.current) return;
    const quill = quillInstanceRef.current;
    const range = quill.getSelection() || { index: quill.getLength() };
    const speakerLabel = `S${speakerNumber}`;
    const formattedTimestamp = `${timestamp} ${speakerLabel}: `;
    quill.insertText(range.index, formattedTimestamp, 'user');
    quill.setSelection(range.index + formattedTimestamp.length);
    // Validation removed - user must click button to validate
  };

  // Split paragraph at cursor, insert timestamp, and move text after cursor to a new paragraph.
  // Always uses the configured speaker number (no increment). Highlights the speaker number for editing.
  const splitParagraphWithTimestamp = (timestamp, speakerNumber = 1) => {
    if (!quillInstanceRef.current) return;
    const quill = quillInstanceRef.current;
    const range = quill.getSelection();
    if (!range) return;

    // Get the full content to find paragraph boundaries
    const fullText = quill.getText();
    let cursorIndex = range.index;

    // Find the end of the current paragraph (look forwards for '\n' or end of text)
    let paragraphEnd = fullText.length;
    for (let i = cursorIndex; i < fullText.length; i++) {
      if (fullText[i] === '\n') {
        paragraphEnd = i;
        break;
      }
    }

    // Get the text from cursor to end of paragraph
    const textAfterCursor = fullText.substring(cursorIndex, paragraphEnd);

    // Insert a newline at cursor, then insert the new timestamp + speaker (no increment) + text after
    const newTimestamp = `${timestamp} S${speakerNumber}: `;
    
    // Delete text after cursor up to the end of paragraph
    quill.deleteText(cursorIndex, textAfterCursor.length, 'user');

    // Insert two newlines (creates an empty line) and then the new paragraph
    quill.insertText(cursorIndex, '\n\n', 'user');
    quill.insertText(cursorIndex + 2, newTimestamp + textAfterCursor, 'user');

    // Highlight the speaker number (the digit after 'S') for editing
    // Position of 'S' is at: cursorIndex + 2 (for the two newlines) + timestamp.length + 1 (for space)
    const speakerNumberPos = cursorIndex + 2 + timestamp.length + 2; // +2 for " S"
    quill.setSelection(speakerNumberPos, 1); // Select just the digit
    // Validation removed - user must click button to validate
  };

  // Parse timestamp strings like H:MM:SS(.ms) or M:SS(.ms) into seconds
  const parseTimestampToSeconds = (ts) => {
    if (!ts || typeof ts !== 'string') return NaN;
    const parts = ts.split(':').map(p => p.trim());
    if (parts.length === 3) {
      const h = parseFloat(parts[0]) || 0;
      const m = parseFloat(parts[1]) || 0;
      const s = parseFloat(parts[2]) || 0;
      return h * 3600 + m * 60 + s;
    } else if (parts.length === 2) {
      const m = parseFloat(parts[0]) || 0;
      const s = parseFloat(parts[1]) || 0;
      return m * 60 + s;
    } else if (parts.length === 1) {
      return parseFloat(parts[0]) || 0;
    }
    return NaN;
  };

  // Find all timestamp occurrences in content. Returns array sorted by index.
  // Only matches timestamps in these formats:
  // 1. Start of line with speaker label: "0:00:00.0 S1:" or "00:00:00.0 S1:"
  // 2. Blank timestamps: "[0:00:00.0] ____"
  const findAllTimestamps = (content) => {
    const matches = [];
    // Combined pattern: match either format in a single pass for better performance
    // (?:^|\n)(\d{1,2}:\d{2}:\d{2}(?:\.\d+)?)\s+S\d+: OR \[(\d{1,2}:\d{2}:\d{2}(?:\.\d+)?)\]\s+____
    const combinedRegex = /(?:(?:^|\n)(\d{1,2}:\d{2}:\d{2}(?:\.\d+)?)\s+S\d+:|\[(\d{1,2}:\d{2}:\d{2}(?:\.\d+)?)\]\s+____)/gm;
    let m;
    while ((m = combinedRegex.exec(content)) !== null) {
      if (m[1]) {
        // Speaker timestamp format
        const timestamp = m[1];
        const timestampIndex = m.index + (m[0].startsWith('\n') ? 1 : 0);
        matches.push({ 
          index: timestampIndex, 
          length: timestamp.length, 
          text: timestamp, 
          seconds: parseTimestampToSeconds(timestamp) 
        });
      } else if (m[2]) {
        // Blank timestamp format
        const timestamp = m[2];
        const timestampIndex = m.index + 1; // +1 to skip the opening bracket
        matches.push({ 
          index: timestampIndex, 
          length: timestamp.length, 
          text: timestamp, 
          seconds: parseTimestampToSeconds(timestamp) 
        });
      }
    }
    return matches.sort((a, b) => a.index - b.index);
  };

  const clearTimestampHighlights = () => {
    if (!quillInstanceRef.current) return;
    try {
      (timestampHighlightsRef.current || []).forEach(({ index, length }) => {
        quillInstanceRef.current.formatText(index, length, { background: false });
      });
    } catch (e) {
      // ignore
    }
    timestampHighlightsRef.current = [];
    timestampInvalidsRef.current = [];
    setInvalidTimestampCount(0);
    setCurrentInvalidIndex(0);
  };

  // Validate all timestamps and highlight any that break ascending order
  const validateAllTimestamps = () => {
    if (!quillInstanceRef.current) return;
    const quill = quillInstanceRef.current;
    const content = quill.getText();

    // Clear previous timestamp-only highlights
    clearTimestampHighlights();

    const timestamps = findAllTimestamps(content);
    if (timestamps.length === 0) return;

    // Process ALL timestamps in the entire document, not just visible ones
    const invalids = [];
    for (let i = 0; i < timestamps.length; i++) {
      const cur = timestamps[i];
      const prev = timestamps[i - 1];
      const next = timestamps[i + 1];
      const curSec = cur.seconds;
      let isInvalid = false;
      if (prev && !(curSec > prev.seconds)) {
        // not later than previous
        isInvalid = true;
      }
      if (next && !(curSec < next.seconds)) {
        // not before next
        isInvalid = true;
      }
      if (isInvalid) invalids.push(cur);
    }

    // Apply highlight to all invalid timestamps
    invalids.forEach(({ index, length }) => {
      try {
        quill.formatText(index, length, { background: '#FFD54D' });
        timestampHighlightsRef.current.push({ index, length });
      } catch (e) {}
    });

    // Save invalid timestamp objects for listing/navigation
    timestampInvalidsRef.current = invalids;

    // Update UI state for navigation
    setInvalidTimestampCount(invalids.length);
    setCurrentInvalidIndex(invalids.length > 0 ? 0 : 0);
  };

  // Debounce validation to avoid excessive passes on large documents
  const scheduleValidateAllTimestamps = (delay = 200) => {
    if (validateTimerRef.current) {
      clearTimeout(validateTimerRef.current);
    }
    validateTimerRef.current = setTimeout(() => {
      validateTimerRef.current = null;
      validateAllTimestamps();
    }, delay);
  };

  // Validate only timestamps in the viewport (for continuous validation when toggle is on)
  const validateViewportTimestamps = () => {
    if (!quillInstanceRef.current) return;
    const quill = quillInstanceRef.current;
    const content = quill.getText();

    // Clear previous timestamp-only highlights
    clearTimestampHighlights();

    const timestamps = findAllTimestamps(content);
    if (timestamps.length === 0) return;

    // Restrict to visible viewport only
    let visibleTimestamps = timestamps;
    try {
      const editorContainer = editorRef.current?.querySelector('.ql-editor');
      if (editorContainer) {
        const viewportTop = editorContainer.scrollTop;
        const viewportBottom = viewportTop + editorContainer.clientHeight;
        visibleTimestamps = timestamps.filter(t => {
          const bounds = quill.getBounds(t.index, t.length);
          if (!bounds) return false;
          const bTop = bounds.top + viewportTop;
          const bBottom = bTop + bounds.height;
          return bTop < viewportBottom + 200 && bBottom > viewportTop - 200; // buffer for smooth scrolling
        });
      }
    } catch (e) {
      // fallback to all timestamps
    }

    const invalids = [];
    for (let i = 0; i < visibleTimestamps.length; i++) {
      const cur = visibleTimestamps[i];
      const prev = visibleTimestamps[i - 1];
      const next = visibleTimestamps[i + 1];
      const curSec = cur.seconds;
      let isInvalid = false;
      if (prev && !(curSec > prev.seconds)) {
        isInvalid = true;
      }
      if (next && !(curSec < next.seconds)) {
        isInvalid = true;
      }
      if (isInvalid) invalids.push(cur);
    }

    // Apply highlight to viewport invalid timestamps only
    invalids.forEach(({ index, length }) => {
      try {
        quill.formatText(index, length, { background: '#FFD54D' });
        timestampHighlightsRef.current.push({ index, length });
      } catch (e) {}
    });
  };

  const scheduleValidateViewportTimestamps = (delay = 200) => {
    if (validateTimerRef.current) {
      clearTimeout(validateTimerRef.current);
    }
    validateTimerRef.current = setTimeout(() => {
      validateTimerRef.current = null;
      validateViewportTimestamps();
    }, delay);
  };

  // Compute available height for invalid timestamps panel based on editor area
  const computeInvalidPanelHeight = () => {
    try {
      const editorContainer = editorRef.current?.querySelector('.ql-editor');
      if (editorContainer) {
        // Reserve some space for headers/toolbars in the right column
        const available = editorContainer.clientHeight - 80; // leave room for header
        setInvalidPanelMaxHeight(Math.max(120, available));
        return;
      }
    } catch (e) {
      // ignore
    }
    setInvalidPanelMaxHeight(Math.max(120, window.innerHeight - 220));
  };

  useEffect(() => {
    computeInvalidPanelHeight();
    const onResize = () => computeInvalidPanelHeight();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Recompute when the invalid list panel is opened
  useEffect(() => {
    if (showInvalidList) computeInvalidPanelHeight();
  }, [showInvalidList]);

  // Return true if the current selection is at the start of a paragraph/line
  const isCursorAtStartOfParagraph = () => {
    if (!quillInstanceRef.current) return false;
    const quill = quillInstanceRef.current;
    const range = quill.getSelection();
    if (!range) return false;
    const idx = range.index;
    if (idx === 0) return true;
    // If previous character is a newline, we're at the start of a paragraph
    const prev = quill.getText(idx - 1, 1);
    return prev === '\n';
  };

  const findAndHighlight = (text, caseSensitive = false, wholeWord = false) => {
    if (!quillInstanceRef.current) return;
    const content = quillInstanceRef.current.getText();
    const flags = caseSensitive ? '' : 'i';
    let pattern = text;
    
    if (wholeWord) {
      // Escape special regex characters and wrap with word boundaries
      const escapedText = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      pattern = `\\b${escapedText}\\b`;
    }
    
    const regex = new RegExp(pattern, flags);
    const match = content.match(regex);
    if (match) {
      const index = match.index;
      quillInstanceRef.current.setSelection(index, match[0].length);
      quillInstanceRef.current.formatText(index, match[0].length, { background: 'yellow' });
    } else {
      alert('Text not found.');
    }
  };

  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  const replaceText = (findText, replaceText, caseSensitive = false, wholeWord = false) => {
    if (!quillInstanceRef.current) return;
    const escapedFindText = escapeRegExp(findText);
    const flags = caseSensitive ? '' : 'i';
    let pattern = escapedFindText;
    
    if (wholeWord) {
      pattern = `\\b${escapedFindText}\\b`;
    }
    
    const regex = new RegExp(pattern, flags);
    const content = quillInstanceRef.current.getText();
    const match = content.match(regex);
    if (match) {
      const index = match.index;
      quillInstanceRef.current.deleteText(index, match[0].length);
      quillInstanceRef.current.insertText(index, replaceText);
    } else {
      alert('Text not found.');
    }
  };

  const getText = () => {
    if (!quillInstanceRef.current) return;
    return quillInstanceRef.current.getText();
  };

  const replaceAll = (findText, replaceText, caseSensitive = false, wholeWord = false) => {
    if (!quillInstanceRef.current) return;
    const escapedFindText = escapeRegExp(findText);
    const flags = 'g' + (caseSensitive ? '' : 'i');
    let pattern = escapedFindText;
    
    if (wholeWord) {
      pattern = `\\b${escapedFindText}\\b`;
    }
    
    const regex = new RegExp(pattern, flags);
    const content = quillInstanceRef.current.getText();
    const newContent = content.replace(regex, replaceText);
    quillInstanceRef.current.setText(newContent);
  };

  const replaceSpeakerLabel = (fromLabel, toLabel) => {
    if (!quillInstanceRef.current || !highlightedText.includes(fromLabel)) return;
  
    const updatedText = highlightedText.replace(new RegExp(`\\b${fromLabel}\\b`, 'g'), toLabel);
  
    // Replace only within the selected range
    quillInstanceRef.current.deleteText(selectionRange.index, selectionRange.length);
    quillInstanceRef.current.insertText(selectionRange.index, updatedText);

    // Apply the blue highlight after swapping
    //quillInstanceRef.current.formatText(selectionRange.index, updatedText.length, { background: '#3399FF' });
  
    setHighlightedText(updatedText); // Update state
    
  };
  
  const swapSpeakerLabels = (label1, label2) => {
    if (!quillInstanceRef.current || (!highlightedText.includes(label1) && !highlightedText.includes(label2))) return;
  
    const updatedText = highlightedText.replace(new RegExp(`\\b(${label1}|${label2})\\b`, 'g'), (match) =>
      match === label1 ? label2 : label1
    );
  
    // Replace only within the selected range
    quillInstanceRef.current.deleteText(selectionRange.index, selectionRange.length);
    quillInstanceRef.current.insertText(selectionRange.index, updatedText);

    //Re-apply highlight after swapping labels
    //quillInstanceRef.current.formatText(selectionRange.index, updatedText.length, { background: '#3399FF' });
  
    setHighlightedText(updatedText); // Update state
  };

  // Create timestamp index for faster lookup
  const createTimestampIndex = (content) => {
    const timestamps = [];
    const lines = content.split('\n');
    
    let charIndex = 0;
    lines.forEach((line, index) => {
      const match = line.match(/^(\d+):(\d+):(\d+\.?\d*)\s+S\d+:/);
      if (match) {
        const hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const seconds = parseFloat(match[3]);
        const time = hours * 3600 + minutes * 60 + seconds;
        
        timestamps.push({ 
          time, 
          lineIndex: index, 
          charIndex: charIndex,
          text: line 
        });
      }
      charIndex += line.length + 1; // +1 for newline
    });
    
    return timestamps.sort((a, b) => a.time - b.time);
  };

  // Binary search for faster timestamp lookup
  const findClosestTimestamp = (targetTime, timestamps) => {
    if (timestamps.length === 0) return null;
    
    let left = 0;
    let right = timestamps.length - 1;
    let closest = timestamps[0];
    let closestDiff = Math.abs(timestamps[0].time - targetTime);
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const current = timestamps[mid];
      const diff = Math.abs(current.time - targetTime);
      
      if (diff < closestDiff) {
        closestDiff = diff;
        closest = current;
      }
      
      if (current.time < targetTime) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    
    return closest;
  };

  const navigateToTime = (targetTime) => {
    if (!quillInstanceRef.current || timestampIndex.length === 0) {
      return;
    }
    
    const closest = findClosestTimestamp(targetTime, timestampIndex);
    if (closest) {
      // Set selection to that position
      quillInstanceRef.current.setSelection(closest.charIndex, 0);
      
      // Small delay to ensure selection is applied before calculating bounds
      setTimeout(() => {
        // Get the editor container
        const editorContainer = editorRef.current.querySelector('.ql-editor');

        if (editorContainer) {
          // Get the bounds of the target position
          const bounds = quillInstanceRef.current.getBounds(closest.charIndex);
          
          // Calculate the scroll position
          const containerHeight = editorContainer.clientHeight;
          const scrollTop = bounds.top - 50; // Position near the top with 50px offset
          
          // Ensure scroll position is within bounds
          const maxScroll = editorContainer.scrollHeight - containerHeight;
          const finalScrollTop = Math.max(0, Math.min(scrollTop, maxScroll));
          
          // Apply the scroll
          editorContainer.scrollTop = finalScrollTop;
          // Alternative: Find the actual text element and scroll it into view
          try {
            // Get the text content around the timestamp
            const textAround = quillInstanceRef.current.getText(Math.max(0, closest.charIndex - 10), 50);
            console.log('textAround', textAround);
            
            // Find the timestamp in the text
            const timestampMatch = textAround.match(/(\d+:\d+:\d+\.?\d*)\s+S\d+:/);
            if (timestampMatch) {
              // Find the DOM element containing this text
              const textNodes = editorContainer.querySelectorAll('*');
              for (let node of textNodes) {
                if (node.textContent && node.textContent.includes(timestampMatch[0])) {
                  console.log('Found element with timestamp:', node);
                  node.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center',
                    inline: 'nearest'
                  });
                  break;
                }
              }
            }
          } catch (error) {
            console.log('scrollIntoView failed, using manual scroll', error);
          }
        }
      }, 50); // 50ms delay
    }
  };

  // Make timestamps clickable
  const makeTimestampsClickable = (callback) => {
    setOnTimestampClick(() => callback);
    
    if (quillInstanceRef.current) {
      // Add a right-click handler to the entire editor
      const editorContainer = editorRef.current.querySelector('.ql-editor');
      if (editorContainer) {
        // Remove existing handlers
        editorContainer.removeEventListener('contextmenu', handleEditorRightClick);
        
        // Add new right-click handler
        editorContainer.addEventListener('contextmenu', handleEditorRightClick);
      }
    }
  };

  // Handle right-clicks on timestamps within the editor
  const handleEditorRightClick = (e) => {
    if (!onTimestampClick || !quillInstanceRef.current) return;
    // Get the clicked position
    const range = quillInstanceRef.current.getSelection();
    if (!range) return;
    // Get text around the clicked position
    const textBefore = quillInstanceRef.current.getText(Math.max(0, range.index - 30), 30);
    const textAfter = quillInstanceRef.current.getText(range.index, 30);
    const surroundingText = textBefore + textAfter;
    const timestampMatch = surroundingText.match(/(\d+):(\d+):(\d+\.?\d*)\s+S\d+:/);
    // Check for highlighted text
    let selectedText = '';
    let showGoogle = false;
    let showSwapSpeaker = false;
    if (range.length > 0) {
      selectedText = quillInstanceRef.current.getText(range.index, range.length).trim();
      showGoogle = selectedText.length > 0;
      // Check for speaker labels in selected text
      const speakerLabels = selectedText.match(/S\d+/g);
      showSwapSpeaker = speakerLabels && speakerLabels.length > 0;
    }
    // Only show menu if timestamp or selection
    // Always show speaker snippets option in context menu if there are any speakers
    const showSpeakerSnips = detectedSpeakerCount > 0;
    if (timestampMatch || showGoogle || showSwapSpeaker || showSpeakerSnips) {
      e.preventDefault();
      lastMenuOpenTimeRef.current = Date.now();
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        timestamp: timestampMatch ? (parseInt(timestampMatch[1]) * 3600 + parseInt(timestampMatch[2]) * 60 + parseFloat(timestampMatch[3])) : null,
        clickIndex: range.index,
        selectedText,
        showGoogle,
        showPlay: !!timestampMatch,
        showSwapSpeaker,
        showSpeakerSnippets: showSpeakerSnips,
      });
    }
  };

  // Handle context menu item click
  const handleContextMenuClick = (action) => {
    if (action === 'play' && contextMenu.timestamp && onTimestampClick) {
      highlightClickedTimestamp(contextMenu.clickIndex);
      onTimestampClick(contextMenu.timestamp);
    } else if (action === 'google' && contextMenu.selectedText) {
      const query = encodeURIComponent(contextMenu.selectedText);
      window.open(`https://www.google.com/search?q=${query}`, '_blank');
    } else if (action === 'swapSpeaker' && contextMenu.selectedText && onRequestSwapModal) {
      onRequestSwapModal(contextMenu.selectedText);
    } else if (action === 'speakerSnippets') {
      const { snippets, order } = buildSpeakerSnippets();
      setSpeakerSnippets(snippets);
      setSpeakerOrder(order);
      setShowSpeakerSnippets(true);
    } else if (action === 'joinParagraphs') {
      joinParagraphs();
    } else if (action === 'removeActiveListeningCues') {
      removeActiveListeningCues();
    }
    setSuggestions([]);
    setContextMenu({ visible: false, x: 0, y: 0, timestamp: null, clickIndex: 0, selectedText: '', showGoogle: false, showPlay: false, showSwapSpeaker: false });
  };

  // Handle clicks outside to close suggestions and context menu
  const handleClickOutside = (event) => {
    // Ignore the first event after opening the menu
    if (Date.now() - lastMenuOpenTimeRef.current < 150) return;
    const menuContains = contextMenuRef.current && contextMenuRef.current.contains(event.target);
    if (!menuContains) {
      setSuggestions([]);
      setContextMenu({ visible: false, x: 0, y: 0, timestamp: null, clickIndex: 0, selectedText: '', showGoogle: false, showPlay: false, showSwapSpeaker: false });
    }
  };

  // Add visual feedback when timestamp is clicked
  const highlightClickedTimestamp = (clickIndex) => {
    if (!quillInstanceRef.current) return;
    
    // Find the timestamp around the click
    const textBefore = quillInstanceRef.current.getText(Math.max(0, clickIndex - 30), 30);
    const textAfter = quillInstanceRef.current.getText(clickIndex, 30);
    const surroundingText = textBefore + textAfter;
    
    const timestampMatch = surroundingText.match(/(\d+):(\d+):(\d+\.?\d*)\s+S\d+:/);
    if (timestampMatch) {
      const timestampText = timestampMatch[0];
      const timestampStart = surroundingText.indexOf(timestampText);
      const actualStart = Math.max(0, clickIndex - 30) + timestampStart;
      
      // Highlight the timestamp briefly
      quillInstanceRef.current.formatText(actualStart, timestampText.length, { 
        background: '#3b82f6',
        color: 'white'
      });
      
      // Remove highlight after 500ms
      setTimeout(() => {
        quillInstanceRef.current.formatText(actualStart, timestampText.length, { 
          background: false,
          color: false
        });
      }, 500);
    }
  };

  // Update timestamp index when content changes
  useEffect(() => {
    if (quillInstanceRef.current) {
      const content = quillInstanceRef.current.getText();
      const index = createTimestampIndex(content);
      setTimestampIndex(index);
      // Update speaker count snapshot
      const speakerMatches = content.match(/\bS\d+:/g) || [];
      const speakerSet = new Set(speakerMatches.map(s => s.replace(/:$/, '')));
      const count = speakerSet.size;
      console.log('Speaker detection:', { 
        matches: speakerMatches, 
        unique: Array.from(speakerSet), 
        count,
        contentLength: content.length 
      });
      setDetectedSpeakerCount(count);
    }
  }, [transcript]); // Only depend on transcript changes

  // If highlights are enabled, re-run highlight pass when transcript changes
  useEffect(() => {
    if (showHighlightRepeated) {
      // Re-apply highlights based on the latest transcript
      highlightRepeatedSpeakers(true);
    }
  }, [transcript, showHighlightRepeated]);

  // Continuous viewport validation when toggle is enabled
  useEffect(() => {
    if (validateTimestampsEnabled) {
      scheduleValidateViewportTimestamps(200);
    } else {
      clearTimestampHighlights();
    }
  }, [transcript, validateTimestampsEnabled]);

  // Add scroll listener for viewport validation
  useEffect(() => {
    if (!validateTimestampsEnabled) return;
    
    const editorContainer = editorRef.current?.querySelector('.ql-editor');
    if (!editorContainer) return;

    const handleScroll = () => {
      scheduleValidateViewportTimestamps(150);
    };

    editorContainer.addEventListener('scroll', handleScroll);
    return () => {
      editorContainer.removeEventListener('scroll', handleScroll);
    };
  }, [validateTimestampsEnabled]);

  // Apply click handlers when onTimestampClick changes
  useEffect(() => {
    if (onTimestampClick && quillInstanceRef.current) {
      makeTimestampsClickable(onTimestampClick);
    }
  }, [onTimestampClick]);

  // Reset selected suggestion index when suggestions change
  useEffect(() => {
    setSelectedSuggestionIndex(0);
  }, [suggestions]);

  // Update suggestionContextRef when selectedSuggestionIndex changes
  useEffect(() => {
    if (!quillInstanceRef.current) return;
    const quill = quillInstanceRef.current;
    const range = quill.getSelection();
    if (!range) return;
    const textBeforeCursor = quill.getText(0, range.index);
    const match = textBeforeCursor.match(/\b\w*$/);
    const prefix = match ? match[0] : '';
    suggestionContextRef.current = { prefix, cursorIndex: range.index };
  }, [selectedSuggestionIndex]);

  // Function to toggle highlight repeated consecutive speakers
  const highlightRepeatedSpeakers = (shouldHighlight = true) => {
    if (!quillInstanceRef.current) return;
    
    // Get all text from the editor
    const content = quillInstanceRef.current.getText();
    
    // If we're removing highlight, clear only the previous repeated-speaker highlights
    if (!shouldHighlight) {
      try {
        (repeatedPositionsRef.current || []).forEach(({ index, length }) => {
          quillInstanceRef.current.formatText(index, length, { background: false });
        });
      } catch (e) {
        // ignore
      }
      repeatedPositionsRef.current = [];
      setCurrentRepeatedIndex(0);
      console.log('[Textarea] Cleared repeated speaker highlights');
      // Validation removed - user must click button to validate
      return;
    }
    
    // Pattern to match speaker labels: S1, S2, S3, etc.
    const speakerPattern = /\bS(\d+)\b/g;
    
    let match;
    let previousSpeaker = null;
    const positions = []; // Array to store positions of repeated speakers
    
    // First pass: find all speaker labels and identify repeats
    while ((match = speakerPattern.exec(content)) !== null) {
      const currentSpeaker = match[1]; // Get just the number (e.g., "1" from "S1")
      if (previousSpeaker === currentSpeaker) {
        // Found a repeat - highlight this occurrence
        positions.push({
          index: match.index,
          length: match[0].length,
          speaker: currentSpeaker
        });
      }
      previousSpeaker = currentSpeaker;
    }
    
    // If no repeats found, just return without alert
    if (positions.length === 0) {
      console.log('[Textarea] No repeated consecutive speakers found');
      return;
    }
    
    // Clear any previous repeated-speaker highlights (preserve other highlights)
    try {
      (repeatedPositionsRef.current || []).forEach(({ index, length }) => {
        quillInstanceRef.current.formatText(index, length, { background: false });
      });
    } catch (e) {
      // ignore
    }
    
    // Apply red highlight to repeated speakers
    positions.forEach(({ index, length }) => {
      quillInstanceRef.current.formatText(index, length, { background: '#FF6B6B' }); // Red highlight
    });

    // Save positions for navigation
    repeatedPositionsRef.current = positions;
    setCurrentRepeatedIndex(0);

    console.log(`[Textarea] Highlighted ${positions.length} repeated speaker(s)`);
  };

  // Navigate to a repeated speaker occurrence by ordinal index
  const goToRepeatedAt = (ordinal) => {
    const positions = repeatedPositionsRef.current || [];
    if (!quillInstanceRef.current || positions.length === 0) return;
    const idx = Math.max(0, Math.min(positions.length - 1, ordinal));
    const { index, length } = positions[idx];
    const quill = quillInstanceRef.current;

    // Set selection at the speaker label
    try {
      quill.setSelection(index, length);
    } catch (e) {
      // ignore selection errors
    }

    // Scroll editor so the selected range is visible (center it)
    const editorEl = editorRef.current; // container where Quill was mounted
    const qEditor = editorEl?.querySelector('.ql-editor');
    if (qEditor) {
      const bounds = quill.getBounds(index, length);
      const top = bounds.top + qEditor.scrollTop;
      const center = Math.max(0, top - (qEditor.clientHeight / 2));

      // Smooth scroll with a safe fallback for environments without behavior support
      try {
        if (typeof qEditor.scrollTo === 'function') {
          qEditor.scrollTo({ top: center, behavior: 'smooth' });
        } else if (typeof qEditor.scroll === 'function') {
          qEditor.scroll({ top: center, behavior: 'smooth' });
        } else {
          // Fallback: animate via requestAnimationFrame
          const start = qEditor.scrollTop;
          const change = center - start;
          const duration = 350;
          let startTime = null;
          const easeInOut = (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
          const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const progress = Math.min(1, elapsed / duration);
            qEditor.scrollTop = start + change * easeInOut(progress);
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      } catch (e) {
        // In case of any errors, fallback to instant scroll
        qEditor.scrollTop = center;
      }
    }

    setCurrentRepeatedIndex(idx);
  };

  const goToNextRepeated = () => {
    const positions = repeatedPositionsRef.current || [];
    if (positions.length === 0) return;
    const next = (currentRepeatedIndex + 1) % positions.length;
    goToRepeatedAt(next);
  };

  const goToPrevRepeated = () => {
    const positions = repeatedPositionsRef.current || [];
    if (positions.length === 0) return;
    const prev = (currentRepeatedIndex - 1 + positions.length) % positions.length;
    goToRepeatedAt(prev);
  };

  // Navigate to invalid timestamp occurrence by ordinal
  const goToInvalidAt = (ordinal) => {
    const positions = timestampHighlightsRef.current || [];
    if (!quillInstanceRef.current || positions.length === 0) return;
    const idx = Math.max(0, Math.min(positions.length - 1, ordinal));
    const { index, length } = positions[idx];
    const quill = quillInstanceRef.current;

    try {
      quill.setSelection(index, length);
    } catch (e) {}

    // Scroll into view using same smooth fallback
    const editorEl = editorRef.current;
    const qEditor = editorEl?.querySelector('.ql-editor');
    if (qEditor) {
      const bounds = quill.getBounds(index, length);
      const top = bounds.top + qEditor.scrollTop;
      const center = Math.max(0, top - (qEditor.clientHeight / 2));
      try {
        if (typeof qEditor.scrollTo === 'function') {
          qEditor.scrollTo({ top: center, behavior: 'smooth' });
        } else if (typeof qEditor.scroll === 'function') {
          qEditor.scroll({ top: center, behavior: 'smooth' });
        } else {
          const start = qEditor.scrollTop;
          const change = center - start;
          const duration = 350;
          let startTime = null;
          const easeInOut = (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
          const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const progress = Math.min(1, elapsed / duration);
            qEditor.scrollTop = start + change * easeInOut(progress);
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      } catch (e) {
        qEditor.scrollTop = center;
      }
    }

    setCurrentInvalidIndex(idx);
  };

  const goToNextInvalid = () => {
    const positions = timestampHighlightsRef.current || [];
    if (positions.length === 0) return;
    const next = (currentInvalidIndex + 1) % positions.length;
    goToInvalidAt(next);
  };

  const goToPrevInvalid = () => {
    const positions = timestampHighlightsRef.current || [];
    if (positions.length === 0) return;
    const prev = (currentInvalidIndex - 1 + positions.length) % positions.length;
    goToInvalidAt(prev);
  };

  // Expose the `insertTimestamp` method to the parent component
  useImperativeHandle(ref, () => ({
    insertTimestamp,
    insertTimestampForced,
    splitParagraphWithTimestamp,
    isCursorAtStartOfParagraph,
    findAndHighlight,
    replaceText,
    replaceAll,
    getText,
    replaceSpeakerLabel,
    swapSpeakerLabels,
    navigateToTime,
    makeTimestampsClickable,
    highlightRepeatedSpeakers,
    setText: (text) => {
      if (quillInstanceRef.current) {
        quillInstanceRef.current.setText(text);
      }
    },
    formatTitleCase, // Expose the function
    fixTranscript,
    joinParagraphs,
    removeActiveListeningCues,
    // Expose trigger functions and state
    toggleSpeakerSnippets: () => {
      const { snippets, order } = buildSpeakerSnippets();
      setSpeakerSnippets(snippets);
      setSpeakerOrder(order);
      setShowSpeakerSnippets(v => !v);
    },
    toggleNotes: () => setShowNotes(v => !v),
    showSpeakerSnippets,
    showNotes,
    detectedSpeakerCount,
  }));

  useEffect(() => {
    suggestionsRef.current = suggestions;
  }, [suggestions]);

  // Persist notes
  useEffect(() => {
    try {
      localStorage.setItem('transcript_notes', notes);
    } catch (e) {
      // ignore storage errors
    }
  }, [notes]);

  // Persist notes width when it changes
  useEffect(() => {
    try {
      localStorage.setItem('transcript_notes_width', String(notesWidth));
    } catch (e) {
      // ignore
    }
  }, [notesWidth]);

  // Persist snippets width when it changes
  // Persist speaker names when they change
  useEffect(() => {
    try {
      localStorage.setItem('speaker_names', JSON.stringify(speakerNames));
    } catch (e) {
      // ignore
    }
  }, [speakerNames]);
  useEffect(() => {
    try {
      localStorage.setItem('transcript_snippets_width', String(snippetsWidth));
    } catch (e) {
      // ignore
    }
  }, [snippetsWidth]);

  // Handle drag to resize notes panel
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizingRef.current) return;
      const delta = startXRef.current - e.clientX;
      const next = Math.max(220, Math.min(700, startWidthRef.current + delta));
      setNotesWidth(next);
    };
    const handleMouseUp = () => {
      if (!isResizingRef.current) return;
      isResizingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Handle drag to resize snippets panel
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizingSnippetsRef.current) return;
      const delta = startXSnippetsRef.current - e.clientX;
      const next = Math.max(220, Math.min(700, startWidthSnippetsRef.current + delta));
      setSnippetsWidth(next);
    };
    const handleMouseUp = () => {
      if (!isResizingSnippetsRef.current) return;
      isResizingSnippetsRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Handle drag to resize invalid timestamps panel
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizingInvalidRef.current) return;
      const delta = startXInvalidRef.current - e.clientX;
      const next = Math.max(160, Math.min(900, startWidthInvalidRef.current + delta));
      setInvalidPanelWidth(next);
    };
    const handleMouseUp = () => {
      if (!isResizingInvalidRef.current) return;
      isResizingInvalidRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Persist invalid panel width
  useEffect(() => {
    try {
      localStorage.setItem('invalid_panel_width', String(invalidPanelWidth));
    } catch (e) {}
  }, [invalidPanelWidth]);

  useEffect(() => {
    if (!editorRef.current) return; // Exit if editorRef is not ready

    // Initialize Quill
    const quill = new Quill(editorRef.current, {
      theme: 'bubble',
      modules: {
        toolbar: false, // Disable the toolbar
        history: { delay: 1000, maxStack: 200, userOnly: true },
      },
      keyboard: {},
      placeholder: 'Start typing your transcription here...',
    });

    // Remove the Quill keyboard binding for Enter (key: 13)
    // quill.keyboard.addBinding(
    //   { key: 13 }, // Enter key
    //   function () {
    //     console.log('key binding done');
    //     if (suggestionsRef.current?.length > 0) {
    //       insertSuggestionAtContext(suggestionsRef.current[0]);
    //       return false; // Prevents default Enter behavior
    //     }
    //     return true; // Allows Enter if no suggestions
    //   }
    // );

    // Assign the Quill instance to the ref
    quillInstanceRef.current = quill;
    // Ensure undo/redo keyboard shortcuts work even if keyboard config is minimal
    try {
      // Ctrl/Cmd+Z => undo
      quill.keyboard.addBinding({ key: 'z', shortKey: true }, function(range, context) {
        try { 
          quill.history.undo();
          // Restore cursor position after undo
          setTimeout(() => {
            const selection = quill.getSelection();
            if (selection) {
              quill.setSelection(selection.index, selection.length);
            }
          }, 0);
        } catch (e) {}
        return false;
      });
      // Ctrl/Cmd+Shift+Z or Ctrl+Y => redo
      quill.keyboard.addBinding({ key: 'z', shortKey: true, shiftKey: true }, function() {
        try { 
          quill.history.redo();
          // Restore cursor position after redo
          setTimeout(() => {
            const selection = quill.getSelection();
            if (selection) {
              quill.setSelection(selection.index, selection.length);
            }
          }, 0);
        } catch (e) {}
        return false;
      });
      quill.keyboard.addBinding({ key: 'y', shortKey: true }, function() {
        try { 
          quill.history.redo();
          // Restore cursor position after redo
          setTimeout(() => {
            const selection = quill.getSelection();
            if (selection) {
              quill.setSelection(selection.index, selection.length);
            }
          }, 0);
        } catch (e) {}
        return false;
      });
    } catch (e) {
      // ignore if keyboard module isn't available
    }
    quill.focus(); // Ensure the editor is focused for typing
    let lastHighlightedRange = null; // Store last highlighted range

    // Remove highlight when clicking inside the editor
    const handleEditorClick = () => {
      console.log('Clicked inside the editor');
      if (lastHighlightedRange) {
        lastHighlightedRange = null; // Reset the stored range
      }
      // If user clicks while in multi-edit mode (check ref), exit multi-edit mode
      if (virtualCursorsRef.current && virtualCursorsRef.current.length > 0) {
        virtualCursorsRef.current = [];
        setReplaceMode(null);
        try { clearCursorOverlay(); } catch (e) {}
        try { clearHighlightedRanges(); } catch (e) {}
        console.log('[Textarea] Exited multi-edit mode due to click');
      }
    };

    const handleKeyDown = (event) => {
      // Mark suggestion trigger on printable key presses so clicks don't open suggestions
      try {
        if (!event.ctrlKey && !event.metaKey && !event.altKey && event.key && event.key.length === 1) {
          suggestionTriggerRef.current = true;
        }
      } catch (e) {}
      if (suggestionsRef.current?.length > 0) {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setSelectedSuggestionIndex((prev) => (prev + 1) % suggestionsRef.current.length);
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          setSelectedSuggestionIndex((prev) => (prev - 1 + suggestionsRef.current.length) % suggestionsRef.current.length);
        } else if (event.key === 'Enter') {
          event.preventDefault();
          event.stopPropagation();
          const suggestion = suggestionsRef.current[selectedSuggestionIndex] || suggestionsRef.current[0];
          insertSuggestionAtContext(suggestion);
        }
      }
      // If we're in multi-edit mode, handle typing/paste/backspace/delete here
      else if (virtualCursorsRef.current && virtualCursorsRef.current.length > 0) {
        // ESC to exit
        if (event.key === 'Escape') {
          event.preventDefault();
          // Clear multi-edit state and visual cues
          virtualCursorsRef.current = [];
          setReplaceMode(null);
          try { clearCursorOverlay(); } catch (e) {}
          try { clearHighlightedRanges(); } catch (e) {}
          console.log('[Textarea] Multi-edit mode exited via Escape');
          return;
        }

        // Handle printable characters
        if (!event.ctrlKey && !event.metaKey && !event.altKey && event.key.length === 1) {
          event.preventDefault();
          const insertText = event.key;
          performMultiEdit({ op: 'insert', text: insertText });
          return;
        }

        // Handle Backspace/Delete
        if (event.key === 'Backspace') {
          event.preventDefault();
          performMultiEdit({ op: 'backspace' });
          return;
        }
        if (event.key === 'Delete') {
          event.preventDefault();
          performMultiEdit({ op: 'delete' });
          return;
        }
      }
      else if (event.ctrlKey && event.key === 'k') {
        // Ctrl+K: Start multi-edit mode with highlighted text
        event.preventDefault();
        const sel = quill.getSelection();
        if (sel && sel.length > 0) {
          const selectedText = quill.getText(sel.index, sel.length);
          const content = quill.getText();
          const escapedText = selectedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`\\b${escapedText}\\b`, 'g');
          const matches = [...content.matchAll(regex)];
          if (matches.length === 0) {
            alert('No matches found for the selected term.');
            return;
          }

          // Build virtual cursors from matches (scan once)
          // Each cursor tracks its insertion offset and whether it has been replaced yet
          const cursors = matches.map(m => ({ start: m.index, length: m[0].length, offset: 0, replaced: false }));
          virtualCursorsRef.current = cursors;
          setReplaceMode({ selectedText });
          replaceInputRef.current = '';
          console.log(`[Textarea] Multi-edit mode started for "${selectedText}", ${cursors.length} cursors created`);

          // Optionally select first occurrence to show user position
          const first = cursors[0];
          quill.setSelection(first.start, first.length);
          // Render visual cues (carets + highlights)
          try { highlightCursorsRanges(); } catch (e) {}
          try { renderCursorOverlay(); } catch (e) {}
        }
      }
      else if (event.altKey && event.key === 's') {
        event.preventDefault(); // Prevent default behavior
        formatSpelling();
      }

      else if (event.ctrlKey && event.key === 'u') {
        event.preventDefault(); // Prevent default Ctrl + U behavior (which is usually underline)
        formatUppercase(); // Function to capitalize all letters
      }
      else if (event.ctrlKey && event.key === 'g') {
        event.preventDefault();
        // Only title-case when there is a non-empty selection
        const sel = quill.getSelection();
        if (sel && sel.length > 0) {
          formatSelectionTitleCase();
        }
      }
    };

    // Paste handler for multi-edit mode
    const handlePaste = (evt) => {
      if (!virtualCursorsRef.current || virtualCursorsRef.current.length === 0) return;
      evt.preventDefault();
      const pasted = (evt.clipboardData || window.clipboardData).getData('text');
      if (pasted && pasted.length > 0) {
        performMultiEdit({ op: 'insert', text: pasted });
      }
    };

    // Perform multi-edit replacement across virtual cursors
    const performMultiEdit = (cmd) => {
      const quill = quillInstanceRef.current;
      const cursors = virtualCursorsRef.current || [];
      if (!quill || !cursors.length) return;

      // Normalize command
      let op = 'insert';
      let text = '';
      if (typeof cmd === 'string') {
        op = 'insert';
        text = cmd;
      } else if (cmd && typeof cmd === 'object') {
        op = cmd.op || 'insert';
        text = cmd.text || '';
      }

      // Apply edits from last to first to avoid index shift issues
      for (let i = cursors.length - 1; i >= 0; i--) {
        const c = cursors[i];

        if (op === 'insert') {
          if (!c.replaced && c.length > 0) {
            // First insertion: replace the original matched text
            quill.deleteText(c.start, c.length);
            if (text.length > 0) quill.insertText(c.start, text);
            c.offset = text.length;
            c.length = text.length;
            c.replaced = true;
          } else {
            // Subsequent insertions: insert at current offset
            const insertPos = c.start + c.offset;
            if (text.length > 0) quill.insertText(insertPos, text);
            c.offset += text.length;
            c.length += text.length;
          }
        } else if (op === 'backspace') {
          if (!c.replaced && c.length > 0) {
            // If not replaced yet, remove the original selection entirely
            quill.deleteText(c.start, c.length);
            c.offset = 0;
            c.length = 0;
            c.replaced = true;
          } else if (c.replaced && c.offset > 0) {
            // Delete char before current insertion point
            const delPos = c.start + c.offset - 1;
            quill.deleteText(delPos, 1);
            c.offset -= 1;
            c.length -= 1;
          }
        } else if (op === 'delete') {
          if (!c.replaced && c.length > 0) {
            // If not replaced yet, remove the original selection entirely
            quill.deleteText(c.start, c.length);
            c.offset = 0;
            c.length = 0;
            c.replaced = true;
          } else if (c.replaced) {
            // Delete char at current insertion point
            const delPos = c.start + c.offset;
            quill.deleteText(delPos, 1);
            // length reduced but offset remains
            c.length = Math.max(0, c.length - 1);
          }
        }
      }

      // After edits, keep multi-edit mode active and update cursors in place
      virtualCursorsRef.current = cursors;
      // Set caret to first edited occurrence for user feedback
      const first = cursors[0];
      const caretPos = first.start + first.offset;
      quill.setSelection(caretPos, 0);
      try { renderCursorOverlay(); } catch (e) {}
    };

    // Render visual caret markers for each virtual cursor into the overlay
    const renderCursorOverlay = () => {
      const overlay = cursorOverlayRef.current;
      if (!overlay || !quill) return;
      overlay.innerHTML = '';
      const cursors = virtualCursorsRef.current || [];
      cursors.forEach((c, idx) => {
        try {
          const pos = c.start + (c.offset || 0);
          const bounds = quill.getBounds(pos);
          const caret = document.createElement('div');
          caret.className = 'multi-caret-marker';
          // style the caret: thin blue line with small top offset
          caret.style.position = 'absolute';
          caret.style.width = '2px';
          caret.style.background = '#2563EB';
          caret.style.left = `${bounds.left}px`;
          caret.style.top = `${bounds.top}px`;
          caret.style.height = `${Math.max(16, bounds.height)}px`;
          caret.style.pointerEvents = 'none';
          caret.style.zIndex = 50;
          // Optionally add a small label with index for debugging
          caret.setAttribute('data-cursor-index', String(idx + 1));
          overlay.appendChild(caret);
        } catch (e) {
          // ignore bounds errors
        }
      });
    };

    const clearCursorOverlay = () => {
      const overlay = cursorOverlayRef.current;
      if (overlay) overlay.innerHTML = '';
    };

    const highlightCursorsRanges = () => {
      if (!quill) return;
      const cursors = virtualCursorsRef.current || [];
      formattedRangesRef.current = [];
      cursors.forEach(c => {
        try {
          // apply a light background to each matched range (or inserted text)
          const len = Math.max(1, c.length || 0);
          quill.formatText(c.start, len, { background: '#FFF59D' });
          formattedRangesRef.current.push({ start: c.start, length: len });
        } catch (e) {}
      });
    };

    const clearHighlightedRanges = () => {
      if (!quill) return;
      // Attempt to clear backgrounds for ranges we recorded
      const ranges = formattedRangesRef.current || [];
      ranges.forEach(r => {
        try { quill.formatText(r.start, Math.max(1, r.length), { background: false }); } catch (e) {}
      });
      formattedRangesRef.current = [];
    };

    // quill.on('selection-change', handleSelectionChange);
    quill.root.addEventListener('click', handleEditorClick);
    quill.root.addEventListener('keydown', handleKeyDown);
    // Listen for paste events to trigger suggestions
    quill.root.addEventListener('paste', (e) => {
      suggestionTriggerRef.current = true;
    });
    quill.root.addEventListener('contextmenu', handleEditorRightClick);

    quill.on('text-change', () => {
      handleTextChange();
      const range = quill.getSelection();
      if (range) {
        // If in multi-edit mode, refresh overlay positions
        if (virtualCursorsRef.current && virtualCursorsRef.current.length > 0) {
          try { renderCursorOverlay(); } catch (e) {}
        }
      }
      // Reset suggestion trigger after processing input
      suggestionTriggerRef.current = false;
    });

    // Set fixed height and custom font
    const editorContainer = editorRef.current.querySelector('.ql-editor'); // Access the Quill editor content
    if (editorContainer) {
      editorContainer.style.font = `${fontSize}px Fira Code, sans-serif`; // Set font size and family
      editorContainer.style.padding = '20px'; // Set padding to 20px
      editorContainer.style.setProperty('line-height', '38px', 'important'); // Adjust line height for better readability
      editorContainer.style.overflowY = 'auto'; // Enable vertical scrolling
      editorContainer.style.whiteSpace = 'pre-wrap'; // Preserve newlines and wrap text
      editorContainer.style.wordBreak = 'break-word'; // Break long words into the next line
      editorContainer.style.wordSpacing = '5px'; 

      // Hide suggestions on scroll (use suggestionsRef for latest value)
      const handleScroll = () => {
        if (suggestionsRef.current.length > 0) {
          setSuggestions([]);
        }
      };
      editorContainer.addEventListener('scroll', handleScroll);
      quill.__scrollCleanup = () => {
        editorContainer.removeEventListener('scroll', handleScroll);
      };
    }

    // Load the saved transcript from localStorage if available
    const savedTranscript = localStorage.getItem('transcript');
    if (savedTranscript) {
      quill.root.innerHTML = savedTranscript; // Load the saved transcript into Quill
      // Validation removed - user must click button to validate
    }

    // Handle non-breaking spaces and replace with regular spaces
    quill.on('text-change', () => {
      const htmlContent = quill.root.innerHTML; // Get the content of the editor
      const updatedContent = htmlContent.replace(/&nbsp;/g, ' '); // Replace &nbsp; with spaces

      if (htmlContent !== updatedContent) {
        // Use Quill API to set the updated content without resetting the cursor
        const currentSelection = quill.getSelection(); // Save the current cursor position
        quill.root.innerHTML = updatedContent; // Update the content
        quill.setSelection(currentSelection); // Restore the cursor position
      }

      // Save the content to localStorage
      localStorage.setItem('transcript', updatedContent); // Save the content to localStorage
      // Validation removed - user must click button to validate
    });

    // Handle text selection
    quill.on('selection-change', (range) => {
      if (range && range.length > 0) {
        const selectedText = quill.getText(range.index, range.length);
        setHighlightedText(selectedText);
        setSelectionRange(range); 
      }
    });

    return () => {
      quill.off('text-change'); // Clean up on component unmount
      quill.root.removeEventListener('click', handleEditorClick);
      quill.root.removeEventListener('keydown', handleKeyDown);
      quill.root.removeEventListener('contextmenu', handleEditorRightClick);
      // Clean up scroll event
      if (quill.__scrollCleanup) quill.__scrollCleanup();
    };
  }, [fontSize, autosuggestionEnabled]);

  // Add this useEffect to auto-run capitalization every 1 minute
  useEffect(() => {
    const interval = setInterval(() => {
      if (quillInstanceRef.current) {
        formatTitleCase();
      }
    }, 60000); // 60,000 ms = 1 minute
    return () => clearInterval(interval);
  }, []);

  // Handle Ctrl+K replace mode: replace all occurrences as user types
  useEffect(() => {
    if (!replaceMode || !quillInstanceRef.current) return;

    const { selectedText } = replaceMode;

    // Handle text input during replace mode
    // Removed previous replace-on-type behavior; multi-edit is handled inline in keydown/paste handlers
    return;
  }, [replaceMode]);

  // Attach right-click handler only once on mount
  useEffect(() => {
    const editorContainer = editorRef.current && editorRef.current.querySelector('.ql-editor');
    if (!editorContainer) return;
    editorContainer.addEventListener('contextmenu', handleEditorRightClick);
    return () => {
      editorContainer.removeEventListener('contextmenu', handleEditorRightClick);
    };
  }, []); // Only on mount

  // Only add the global click/contextmenu handler when the suggestions popup or context menu is visible
  useEffect(() => {
    if (!contextMenu.visible && suggestions.length === 0) return;
    function handleGlobalClick(event) {
      console.log('[Suggestions Popup] Global click handler fired');
      const menuContains = contextMenuRef.current && contextMenuRef.current.contains(event.target);
      const suggestionsContains = suggestionsBoxRef.current && suggestionsBoxRef.current.contains(event.target);
      if (!menuContains && !suggestionsContains) {
        setSuggestions([]);
        setContextMenu({ visible: false, x: 0, y: 0, timestamp: null, clickIndex: 0, selectedText: '', showGoogle: false, showPlay: false, showSwapSpeaker: false });
      }
    }
    document.addEventListener("mousedown", handleGlobalClick);
    document.addEventListener("touchstart", handleGlobalClick);
    return () => {
      document.removeEventListener("mousedown", handleGlobalClick);
      document.removeEventListener("touchstart", handleGlobalClick);
    };
  }, [contextMenu.visible, suggestions.length]);

  useEffect(() => {
    const editorContainer = editorRef.current && editorRef.current.querySelector('.ql-editor');
    if (!editorContainer) return;
    editorContainer.addEventListener('contextmenu', handleEditorRightClick);
    return () => {
      editorContainer.removeEventListener('contextmenu', handleEditorRightClick);
    };
  }, [editorRef]);

  // Debug: log contextMenu before return
  console.log('contextMenu state:', contextMenu);

  // Helper: checks if a string ends with sentence-ending punctuation
  function endsWithPunctuation(str) {
    const trimmed = str.trim();
    // Check for three dots first, then single punctuation marks
    return /\.{3}$/.test(trimmed) || /[.!?…]$/.test(trimmed);
  }

  // Helper: finds the first sentence-ending punctuation in a string
  function findFirstSentenceEnd(str) {
    // Find the first occurrence of ., ?, !, ..., or ellipsis character
    // Prioritize three dots (...) over single dots
    const ellipsisMatch = str.match(/(\.{3})([^.!?…]*)/);
    if (ellipsisMatch) {
      return ellipsisMatch.index + ellipsisMatch[1].length;
    }
    
    // Then look for single punctuation marks
    const match = str.match(/([.!?…])([^.!?…]*)/);
    if (!match) return -1;
    return match.index + match[0].indexOf(match[1]) + 1;
  }

  // Helper: extract timestamp+speaker label
  function extractLabel(line) {
    // e.g., 0:42:14.0 S1:
    const match = line.match(/^((\d{1,2}:){2}\d{1,2}(?:\.\d+)?\s+S\d+:\s*)/);
    if (match) {
      return { label: match[0], rest: line.slice(match[0].length) };
    }
    return { label: '', rest: line };
  }

  // Helper: checks if a string starts with a timestamp+speaker label
  function isSpeakerLine(line) {
    return /^((\d{1,2}:){2}\d{1,2}(?:\.\d+)?\s+S\d+:\s*)/.test(line);
  }

  // Fix transcript logic
  const fixTranscript = () => {
    if (!quillInstanceRef.current) return;
    const content = quillInstanceRef.current.getText();
    const lines = content.split(/\r?\n/);
    const fixedLines = [];
    let i = 0;
    while (i < lines.length) {
      let line = lines[i];
      if (!line.trim()) {
        i++;
        continue;
      }
      // If this line is a speaker line
      if (isSpeakerLine(line)) {
        // If previous line exists and does not end with punctuation, try to merge
      if (
        fixedLines.length > 0 &&
        !endsWithPunctuation(fixedLines[fixedLines.length - 1]) &&
        isSpeakerLine(fixedLines[fixedLines.length - 1])
      ) {
          const { label, rest } = extractLabel(line);
          const endIdx = findFirstSentenceEnd(rest);
          if (endIdx !== -1) {
            let moved = rest.slice(0, endIdx).trim();
            if (moved.length > 0 && /[A-Z]/.test(moved[0])) {
              moved = moved[0].toLowerCase() + moved.slice(1);
            }
            // Append to previous line (no new line)
            fixedLines[fixedLines.length - 1] = fixedLines[fixedLines.length - 1].replace(/\s+$/, '') + ' ' + moved.replace(/^\s+/, '');
            // The rest of the next line (after the punctuation)
            const restAfter = rest.slice(endIdx).trim();
            if (restAfter) {
              fixedLines.push((label + restAfter).trim());
            }
            i++;
            continue;
          } else {
            // No punctuation, merge the entire rest into previous line and skip this line
            let moved = rest.trim();
            if (moved.length > 0 && /[A-Z]/.test(moved[0])) {
              moved = moved[0].toLowerCase() + moved.slice(1);
            }
            fixedLines[fixedLines.length - 1] = fixedLines[fixedLines.length - 1].replace(/\s+$/, '') + ' ' + moved.replace(/^\s+/, '');
            i++;
            continue;
          }
        }
        fixedLines.push(line.trim());
        i++;
        continue;
      }
      if (endsWithPunctuation(line)) {
        fixedLines.push(line.trim());
        i++;
        continue;
      }
      // Otherwise, look ahead to the next line(s)
      let merged = line;
      let j = i + 1;
      let brokeOnSpeaker = false;
      while (j < lines.length) {
        let nextLine = lines[j];
        if (!nextLine.trim()) {
          merged += ' ';
          j++;
          continue;
        }
        if (isSpeakerLine(nextLine)) {
          brokeOnSpeaker = true;
          break;
        }
        const { label, rest } = extractLabel(nextLine);
        const endIdx = findFirstSentenceEnd(rest);
        if (endIdx !== -1) {
          let moved = rest.slice(0, endIdx).trim();
          if (moved.length > 0 && /[A-Z]/.test(moved[0])) {
            moved = moved[0].toLowerCase() + moved.slice(1);
          }
          merged = merged.replace(/\s+$/, '') + ' ' + moved.replace(/^\s+/, '');
          fixedLines.push(merged.trim());
          // The rest of the next line (after the punctuation)
          const restAfter = rest.slice(endIdx).trim();
          if (label && (restAfter || restAfter === '')) {
            fixedLines.push((label + (restAfter ? restAfter : '')).trim());
          } else if (restAfter) {
            fixedLines.push(restAfter);
          }
          break;
        } else {
          merged += ' ' + rest.trim();
        }
        j++;
      }
      if (brokeOnSpeaker) {
        if (merged.trim()) {
          fixedLines.push(merged.trim());
        }
        i = j;
        continue;
      }
      if (j >= lines.length) {
        if (merged.trim()) {
          fixedLines.push(merged.trim());
        }
        i = j;
        continue;
      }
      i = j + 1;
    }
    // Remove trailing blank lines
    while (fixedLines.length > 0 && fixedLines[fixedLines.length - 1].trim() === '') {
      fixedLines.pop();
    }
    // Join paragraphs with double newline for blank line between paragraphs
    const fixedText = fixedLines.join('\n\n');
    quillInstanceRef.current.setText(fixedText);
  };

  // Join only the highlighted text paragraphs, keeping the first timestamp+speaker label
  const joinParagraphs = () => {
    if (!quillInstanceRef.current) return;
    const range = quillInstanceRef.current.getSelection();
    if (!range || range.length === 0) return;
    const selectedText = quillInstanceRef.current.getText(range.index, range.length);
    // Split by double newlines (paragraphs)
    const paragraphs = selectedText.split(/\r?\n\r?\n/).map(p => p.trim()).filter(Boolean);
    if (paragraphs.length === 0) return;
    // Extract the first timestamp+speaker label
    const firstMatch = paragraphs[0].match(/^((\d{1,2}:){2}\d{1,2}(?:\.\d+)?\s+S\d+:\s*)/);
    let prefix = '';
    let firstContent = paragraphs[0];
    if (firstMatch) {
      prefix = firstMatch[0];
      firstContent = paragraphs[0].slice(prefix.length).trim();
    }
    // Remove all subsequent timestamps and speaker labels
    const cleaned = [firstContent, ...paragraphs.slice(1).map(p => p.replace(/^((\d{1,2}:){2}\d{1,2}(?:\.\d+)?\s+S\d+:\s*)/, '').trim())];
    // Join all cleaned paragraphs with a space
    const joined = prefix + cleaned.join(' ');
    // Replace the selected text with the joined result
    quillInstanceRef.current.deleteText(range.index, range.length);
    quillInstanceRef.current.insertText(range.index, joined);
    quillInstanceRef.current.setSelection(range.index + joined.length, 0);
  };

  // Remove one-word active listening cues after questions in highlighted text
  const removeActiveListeningCues = () => {
    if (!quillInstanceRef.current) return;
    const range = quillInstanceRef.current.getSelection();
    if (!range || range.length === 0) return;
    const selectedText = quillInstanceRef.current.getText(range.index, range.length);
    // List of one-word feedback cues (case-insensitive, with punctuation)
    const cues = [
      'yeah.', 'okay.', 'ok.', 'right.', 'yes.', 'no.', 'uh-huh.', 'yep.', 'mm-hmm.',
    ];
    // Split by double newlines (paragraphs)
    const paragraphs = selectedText.split(/\r?\n\r?\n/);
    const cleaned = [];
    for (let i = 0; i < paragraphs.length; ++i) {
      const prev = i > 0 ? paragraphs[i-1].trim() : '';
      const curr = paragraphs[i].trim();
      // Remove timestamp+speaker label for cue check
      const cueContent = curr.replace(/^((\d{1,2}:){2}\d{1,2}(?:\.\d+)?\s+S\d+:\s*)/, '').trim();
      // If previous paragraph does NOT end with ? and this is a one-word cue, skip it
      if (i > 0 && !/\?$/.test(prev) && cues.includes(cueContent.toLowerCase())) {
        continue;
      }
      cleaned.push(paragraphs[i]);
    }
    // Rejoin with double newlines
    const result = cleaned.join('\n\n');
    quillInstanceRef.current.deleteText(range.index, range.length);
    quillInstanceRef.current.insertText(range.index, result);
    quillInstanceRef.current.setSelection(range.index + result.length, 0);
  };

  // Build speaker snippets from paragraphs
  const buildSpeakerSnippets = () => {
    if (!quillInstanceRef.current) return { snippets: {}, order: [] };
    const content = quillInstanceRef.current.getText();
    const paragraphs = content.split(/\r?\n\r?\n/);
    const items = []; // {speaker, start, end, index}
    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      const match = p.match(/^((\d{1,2}:){2}\d{1,2}(?:\.\d+)?)[\s]+(S\d+):\s*/);
      if (!match) continue;
      const startStr = match[1];
      const speakerId = match[3];
      const toSeconds = (ts) => {
        const [hh, mm, ss] = ts.split(':');
        return parseInt(hh) * 3600 + parseInt(mm) * 60 + parseFloat(ss);
      };
      const start = toSeconds(startStr);
      // Find end time from next paragraph with timestamp
      let end = null;
      for (let j = i + 1; j < paragraphs.length; j++) {
        const n = paragraphs[j];
        const m2 = n.match(/^((\d{1,2}:){2}\d{1,2}(?:\.\d+)?)[\s]+S\d+:\s*/);
        if (m2) {
          end = toSeconds(m2[1]);
          break;
        }
      }
      items.push({ speaker: speakerId, start, end, index: i });
    }
    // Group by speaker
    const bySpeaker = {};
    items.forEach(it => {
      if (!bySpeaker[it.speaker]) bySpeaker[it.speaker] = [];
      bySpeaker[it.speaker].push(it);
    });
    // Sort each speaker's items by start time
    Object.keys(bySpeaker).forEach(k => bySpeaker[k].sort((a,b) => a.start - b.start));
    // Pick only the first occurrence of each speaker
    const snippets = {};
    // Sort speakers numerically (S1, S2, S3, ...) instead of lexicographically (S1, S10, S2)
    const order = Object.keys(bySpeaker).sort((a, b) => {
      const numA = parseInt(a.replace(/^S/, ''), 10);
      const numB = parseInt(b.replace(/^S/, ''), 10);
      return numA - numB;
    });
    order.forEach(sp => {
      snippets[sp] = [bySpeaker[sp][0]];
    });
    return { snippets, order };
  };

  const formatTime = (seconds) => {
    if (seconds == null) return '';
    const sign = seconds < 0 ? '-' : '';
    const s = Math.max(0, Math.abs(seconds));
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = (s % 60).toFixed(1);
    const pad = (n) => (n < 10 ? '0' + n : '' + n);
    return `${sign}${hh}:${pad(mm)}:${ss.padStart(4,'0')}`;
  };

  const stackedPanelWidth = Math.max(
    showFindReplace ? 320 : 0,
    showNotes ? notesWidth : 0
  );

  return (
    <div className="w-full h-[460px] shadow-lg border">
      <div className="flex h-full">
        <div className="flex h-full flex-1 relative min-w-0">
          {/* Quill editor container */}
          <div
            ref={editorRef}
            className="flex-1 min-w-0 font-monox bg-white rounded-md h-full break-words word-space-2 whitespace-pre-wrap"
            title="Right-click on timestamps (like '0:00:36.4 S2:') to play audio from that point"
          ></div>
          {/* Overlay for rendering multi-cursor carets */}
          <div
            ref={cursorOverlayRef}
            className="pointer-events-none"
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          {/* Speaker snippets panel (conditionally shown) */}
          {showSpeakerSnippets && (
            <React.Fragment>
              {/* Resize handle for snippets */}
              <div
                onMouseDown={(e) => {
                  isResizingSnippetsRef.current = true;
                  startXSnippetsRef.current = e.clientX;
                  startWidthSnippetsRef.current = snippetsWidth;
                  document.body.style.cursor = 'col-resize';
                  document.body.style.userSelect = 'none';
                }}
                className="w-1 cursor-col-resize bg-transparent hover:bg-indigo-200"
                title="Drag to resize snippets"
              />
              <div className="h-full border-l bg-white" style={{ width: snippetsWidth }}>
                <div className="h-full flex flex-col">
              <div className="px-3 pt-3 pb-1 text-xs font-semibold text-gray-700 flex items-center justify-between">
                <span>Speaker Snippets</span>
                <div className="flex items-center gap-2 text-[11px]">
                  <label className="flex items-center gap-1 text-gray-500">
                    <span>Count</span>
                    <select
                      className="border rounded px-1 py-[1px]"
                      value={snippetCount}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        setSnippetCount(v);
                        localStorage.setItem('snippet_count', String(v));
                        const { snippets, order } = buildSpeakerSnippets();
                        setSpeakerSnippets(snippets);
                        setSpeakerOrder(order);
                      }}
                    >
                      <option value={1}>1</option>
                      <option value={3}>3</option>
                      <option value={5}>5</option>
                    </select>
                  </label>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-2 space-y-3">
                {speakerOrder.length === 0 && (
                  <div className="text-xs text-gray-500 px-2">No timestamped speakers detected.</div>
                )}
                {speakerOrder.map(sp => (
                  <div key={sp} className="border rounded-md">
                    <div className="px-2 py-1 text-xs font-semibold bg-gray-50 border-b flex items-center gap-2">
                      <span>{sp}:</span>
                      {/* Input for name */}
                      <input
                        type="text"
                        className="border rounded px-1 py-[1px] text-xs w-24"
                        value={speakerNames[sp] || ''}
                        onChange={e => {
                          setSpeakerNames(prev => ({ ...prev, [sp]: e.target.value }));
                        }}
                        placeholder="Name"
                        title="Enter speaker name"
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            // Focus characteristics input if exists
                            document.getElementById(`char-input-${sp}`)?.focus();
                          }
                        }}
                      />
                      {/* Input for adding characteristics */}
                      <input
                        id={`char-input-${sp}`}
                        type="text"
                        className="border rounded px-1 py-[1px] text-xs w-32"
                        placeholder="Add characteristic"
                        onKeyDown={e => {
                          if (e.key === 'Enter' && e.target.value.trim()) {
                            setSpeakerCharacteristics(prev => ({
                              ...prev,
                              [sp]: [...(prev[sp] || []), e.target.value.trim()]
                            }));
                            e.target.value = '';
                          }
                        }}
                      />
                      <button
                        className="ml-1 px-2 py-1 text-xs rounded bg-indigo-100 hover:bg-indigo-200 text-indigo-700"
                        onClick={e => {
                          const input = document.getElementById(`char-input-${sp}`);
                          if (input && input.value.trim()) {
                            setSpeakerCharacteristics(prev => ({
                              ...prev,
                              [sp]: [...(prev[sp] || []), input.value.trim()]
                            }));
                            input.value = '';
                          }
                        }}
                      >
                        Add
                      </button>
                    </div>
                    {/* Characteristics list */}
                    {(speakerCharacteristics[sp] || []).length > 0 && (
                      <div className="px-2 pb-1 flex flex-wrap gap-2">
                        {speakerCharacteristics[sp].map((char, idx) => (
                          <span key={idx} className="inline-flex items-center bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                            {char}
                            <button
                              className="ml-1 text-xs text-red-500 hover:text-red-700"
                              title="Delete characteristic"
                              onClick={() => {
                                setSpeakerCharacteristics(prev => ({
                                  ...prev,
                                  [sp]: prev[sp].filter((_, i) => i !== idx)
                                }));
                              }}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="p-2 flex flex-wrap gap-2">
                      {(speakerSnippets[sp] || []).map((snip, idx) => (
                        <div key={idx} className="flex items-center gap-1">
                          <button
                            className="text-[11px] px-2 py-1 rounded border hover:bg-indigo-50 text-indigo-700 border-indigo-200"
                            title={`Play from ${formatTime(snip.start)}${snip.end != null ? ` to ${formatTime(snip.end)}` : ''}`}
                            onClick={() => {
                              if (onRequestPlayRange) {
                                const dur = (snip.end != null && snip.end > snip.start) ? (snip.end - snip.start) : undefined;
                                onRequestPlayRange(snip.start, dur);
                              } else if (onTimestampClick) {
                                onTimestampClick(snip.start);
                              }
                            }}
                          >
                            {formatTime(snip.start)}
                          </button>
                          {/* Delete individual snippet button */}
                          <button
                            className="text-[10px] px-1 py-1 rounded bg-red-100 hover:bg-red-200 text-red-700"
                            title="Delete this snippet"
                            onClick={() => {
                              setSpeakerSnippets(prev => ({
                                ...prev,
                                [sp]: prev[sp].filter((_, i) => i !== idx)
                              }));
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-2 border-t">
                <button
                  className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200"
                  onClick={() => {
                    const { snippets, order } = buildSpeakerSnippets();
                    setSpeakerSnippets(snippets);
                    setSpeakerOrder(order);
                  }}
                >
                  Rebuild
                </button>
                {onRequestStop && (
                  <button
                    className="ml-2 text-xs px-2 py-1 rounded bg-red-100 hover:bg-red-200 text-red-700"
                    onClick={() => onRequestStop()}
                  >
                    Stop
                  </button>
                )}
                {/* Always show Clear button */}
                <button
                  className="ml-2 text-xs px-2 py-1 rounded bg-yellow-100 hover:bg-yellow-200 text-yellow-700"
                  onClick={() => {
                    if (window.confirm("Are you sure you want to clear all speaker snippets? This cannot be undone.")) {
                      setSpeakerSnippets({});
                      setSpeakerOrder([]);
                    }
                  }}
                >
                  Clear
                </button>
              </div>
            </div>
              </div>
            </React.Fragment>
        )}
        {suggestions.length > 0 && (
        <div
          ref={suggestionsBoxRef}
          className="absolute z-40 bg-white border border-gray-300 shadow-xl rounded-lg p-1 text-xs min-w-[160px] max-w-[260px] transition-all duration-200 ease-out animate-fade-in"
          style={{
            top: suggestionPosition.top,
            left: suggestionPosition.left,
            position: 'absolute',
            maxHeight: suggestions.length > 4 ? '168px' : 'auto', // 4 * 42px (item height + margin)
            overflowY: suggestions.length > 4 ? 'auto' : 'visible',
            boxShadow: '0 8px 24px rgba(37, 99, 235, 0.08)',
          }}
        >
          {suggestions.map((word, index) => (
            <div
              key={index}
              onClick={() => insertSuggestionAtContext(word)}
              className={`cursor-pointer px-3 py-2 rounded-md mb-1 last:mb-0 transition-colors duration-150 flex items-center gap-2 select-none whitespace-nowrap ${index === selectedSuggestionIndex ? 'bg-blue-100 font-bold text-blue-700 shadow-sm scale-[1.03]' : 'hover:bg-blue-50'}`}
              style={index === selectedSuggestionIndex ? { boxShadow: '0 2px 8px rgba(37,99,235,0.10)' } : {}}
            >
              <svg className="w-3 h-3 text-blue-400 opacity-70" fill="currentColor" viewBox="0 0 20 20"><circle cx="10" cy="10" r="10" /></svg>
              <span>{word}</span>
            </div>
          ))}
        </div>
      )}
      
      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          ref={contextMenuRef}
          className="fixed bg-white border border-gray-300 shadow-xl rounded-lg py-1 z-50"
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
            minWidth: '180px'
          }}
        >
          {contextMenu.showPlay && (
            <div
              className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm font-medium text-gray-700 flex items-center"
              onClick={() => handleContextMenuClick('play')}
            >
              <svg className="w-4 h-4 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
              Play from here
            </div>
          )}
          {contextMenu.showGoogle && (
            <div
              className="px-4 py-2 hover:bg-green-50 cursor-pointer text-sm font-medium text-gray-700 flex items-center"
              onClick={() => handleContextMenuClick('google')}
            >
              <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
              Search with Google
            </div>
          )}
          {contextMenu.showSwapSpeaker && (
            <div
              className="px-4 py-2 hover:bg-purple-50 cursor-pointer text-sm font-medium text-gray-700 flex items-center"
              onClick={() => handleContextMenuClick('swapSpeaker')}
            >
              <svg className="w-4 h-4 mr-2 text-purple-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/>
              </svg>
              Swap Speaker Labels
            </div>
          )}
          {contextMenu.selectedText && (
            <div
              className="px-4 py-2 hover:bg-yellow-50 cursor-pointer text-sm font-medium text-gray-700 flex items-center"
              onClick={() => handleContextMenuClick('joinParagraphs')}
            >
              <svg className="w-4 h-4 mr-2 text-yellow-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M4 12h16M12 4v16" />
              </svg>
              Join Paragraphs
            </div>
          )}
          {contextMenu.showSpeakerSnippets && (
            <div
              className="px-4 py-2 hover:bg-indigo-50 cursor-pointer text-sm font-medium text-gray-700 flex items-center"
              onClick={() => handleContextMenuClick('speakerSnippets')}
            >
              <svg className="w-4 h-4 mr-2 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 19V6l12-2v13" />
                <rect x="3" y="10" width="4" height="10" rx="1" />
              </svg>
              Speaker Snippets
            </div>
          )}
          {contextMenu.selectedText && contextMenu.selectedText.match(/^((\d{1,2}:){2}\d{1,2}(?:\.\d+)?)[\s]+S\d+:/) && (
            <div
              className="px-4 py-2 hover:bg-indigo-100 cursor-pointer text-sm font-medium text-indigo-700 flex items-center"
              onClick={() => {
                // Add to Speaker Snippets logic
                const match = contextMenu.selectedText.match(/^((\d{1,2}:){2}\d{1,2}(?:\.\d+)?)[\s]+(S\d+):/);
                if (match) {
                  const startStr = match[1];
                  const speakerId = match[3];
                  const toSeconds = (ts) => {
                    const [hh, mm, ss] = ts.split(':');
                    return parseInt(hh) * 3600 + parseInt(mm) * 60 + parseFloat(ss);
                  };
                  const start = toSeconds(startStr);

                  // Find end time from next timestamp in transcript
                  const content = quillInstanceRef.current.getText();
                  const paragraphs = content.split(/\r?\n\r?\n/);
                  let end = null;
                  let foundIdx = -1;
                  for (let i = 0; i < paragraphs.length; i++) {
                    if (paragraphs[i].includes(contextMenu.selectedText.trim())) {
                      foundIdx = i;
                      break;
                    }
                  }
                  if (foundIdx !== -1) {
                    for (let j = foundIdx + 1; j < paragraphs.length; j++) {
                      const m2 = paragraphs[j].match(/^((\d{1,2}:){2}\d{1,2}(?:\.\d+)?)[\s]+S\d+:\s*/);
                      if (m2) {
                        end = toSeconds(m2[1]);
                        break;
                      }
                    }
                  }

                  // Add to speakerSnippets state
                  setSpeakerSnippets(prev => {
                    const arr = prev[speakerId] ? [...prev[speakerId]] : [];
                    arr.push({ speaker: speakerId, start, end, index: foundIdx });
                    return { ...prev, [speakerId]: arr };
                  });
                  if (!speakerOrder.includes(speakerId)) setSpeakerOrder(order => [...order, speakerId]);
                }
                setContextMenu({ ...contextMenu, visible: false });
              }}
            >
              <svg className="w-4 h-4 mr-2 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 4v16m8-8H4" />
              </svg>
              Add to Speaker Snippets
            </div>
          )}
          {contextMenu.selectedText && (
            <div
              className="px-4 py-2 hover:bg-red-50 cursor-pointer text-sm font-medium text-gray-700 flex items-center"
              onClick={() => handleContextMenuClick('removeActiveListeningCues')}
            >
              <svg className="w-4 h-4 mr-2 text-red-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 12h8M12 8v8" />
              </svg>
              Remove Active Listening Cues
            </div>
          )}
        </div>
      )}
      </div>
      {(showFindReplace || showNotes || showInvalidList) && (
        <div
          className="flex h-full flex-col border-l bg-white"
          style={{ width: stackedPanelWidth || undefined }}
        >
          {showFindReplace && (
            <div className="flex flex-col" style={{ width: '100%' }}>
              <div className="px-3 pt-3 pb-1 text-xs font-semibold text-gray-700 flex items-center justify-between">
                <span>Find & Replace</span>
              </div>
              <div className="flex-1 overflow-auto p-3 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Find</label>
                  <input
                    type="text"
                    className="w-full border rounded px-2 py-1 text-xs"
                    value={findText}
                    onChange={e => setFindText(e.target.value)}
                    placeholder="Enter text to find"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Replace</label>
                  <input
                    type="text"
                    className="w-full border rounded px-2 py-1 text-xs"
                    value={replaceTextValue}
                    onChange={e => setReplaceTextValue(e.target.value)}
                    placeholder="Enter replacement text"
                  />
                </div>
                <div className="flex gap-3 mt-4 text-xs text-gray-600">
                  <label className="inline-flex items-center gap-1">
                    <input
                      type="checkbox"
                      className="rounded text-indigo-600"
                      checked={wholeWord}
                      onChange={(e) => setWholeWord(e.target.checked)}
                    />
                    Whole word
                  </label>
                  <label className="inline-flex items-center gap-1">
                    <input
                      type="checkbox"
                      className="rounded text-indigo-600"
                      checked={caseSensitive}
                      onChange={(e) => setCaseSensitive(e.target.checked)}
                    />
                    Case sensitive
                  </label>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    className="px-3 py-1 rounded bg-indigo-500 text-white text-xs font-semibold"
                    onClick={() => {
                      if (!findText) return;
                      const escaped = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                      const pattern = wholeWord ? `\\b${escaped}\\b` : escaped;
                      const flags = caseSensitive ? 'g' : 'gi';
                      const regex = new RegExp(pattern, flags);
                      const content = quillInstanceRef.current?.getText() || '';
                      const matches = content.match(regex);
                      setFindResultCount(matches ? matches.length : 0);
                      if (matches && matches.length > 0) {
                        const idx = content.toLowerCase().indexOf(findText.toLowerCase());
                        if (idx !== -1) {
                          quillInstanceRef.current.setSelection(idx, findText.length);
                          quillInstanceRef.current.formatText(idx, findText.length, { background: '#fde68a' });
                        }
                      }
                    }}
                  >
                    Find
                  </button>
                  <button
                    className="px-3 py-1 rounded bg-green-500 text-white text-xs font-semibold"
                    onClick={() => {
                      if (!findText) return;
                      const escaped = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                      const pattern = wholeWord ? `\\b${escaped}\\b` : escaped;
                      const flags = caseSensitive ? 'g' : 'gi';
                      const regex = new RegExp(pattern, flags);
                      const content = quillInstanceRef.current?.getText() || '';
                      const newContent = content.replace(regex, replaceTextValue);
                      quillInstanceRef.current?.setText(newContent);
                      setFindResultCount(0);
                    }}
                  >
                    Replace All
                  </button>
                </div>
                {findResultCount > 0 && (
                  <div className="mt-2 text-xs text-gray-500">
                    {findResultCount} match{findResultCount > 1 ? 'es' : ''} found.
                  </div>
                )}
              </div>
            </div>
          )}
          {showInvalidList && !(showFindReplace || showNotes) && (
            <div className="flex h-full flex-col relative" style={{ width: invalidPanelWidth }}>
              <div
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  isResizingInvalidRef.current = true;
                  startXInvalidRef.current = e.clientX;
                  startWidthInvalidRef.current = invalidPanelWidth;
                  document.body.style.cursor = 'col-resize';
                  document.body.style.userSelect = 'none';
                }}
                title="Drag to resize invalid timestamps"
                style={{ position: 'absolute', left: -8, top: 0, bottom: 0, height: '100%', width: 12, zIndex: 9999, cursor: 'col-resize', background: 'linear-gradient(90deg, rgba(229,231,235,0.0), rgba(229,231,235,0.6))', pointerEvents: 'auto' }}
              />
              <div className="px-3 pt-3 pb-1 text-xs font-semibold text-gray-700 flex items-center justify-between">
                <span>Invalid Timestamps</span>
                <div className="flex items-center gap-2">
                  <button
                    className="w-8 h-8 flex items-center justify-center rounded-lg shadow bg-white text-blue-600 hover:bg-blue-50"
                    title="Rebuild list"
                    onClick={() => validateAllTimestamps()}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  <button
                    className="w-8 h-8 flex items-center justify-center rounded-lg shadow bg-white text-yellow-700 hover:bg-yellow-50"
                    title="Previous invalid timestamp"
                    onClick={goToPrevInvalid}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4L6 10l6 6"/></svg>
                  </button>
                  <div className="text-xs text-gray-600">{currentInvalidIndex + 1}/{invalidTimestampCount}</div>
                  <button
                    className="w-8 h-8 flex items-center justify-center rounded-lg shadow bg-white text-yellow-700 hover:bg-yellow-50"
                    title="Next invalid timestamp"
                    onClick={goToNextInvalid}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 4l6 6-6 6"/></svg>
                  </button>
                </div>
              </div>
              <div className="flex-1 p-3 space-y-2" style={{ maxHeight: invalidPanelMaxHeight + 'px', overflowY: 'auto' }}>
                {timestampInvalidsRef.current && timestampInvalidsRef.current.length > 0 ? (
                  timestampInvalidsRef.current.map((it, i) => (
                    <div key={i} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                      <div className="text-sm text-gray-800">{it.text}</div>
                      <div className="flex items-center gap-2">
                        <button
                          className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded"
                          onClick={() => { goToInvalidAt(i); }}
                        >
                          Go
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500">No invalid timestamps</div>
                )}
              </div>
            </div>
          )}
          {showNotes && (
            <div className="flex h-full border-t">
              {/* Resize handle */}
              <div
                onMouseDown={(e) => {
                  isResizingRef.current = true;
                  startXRef.current = e.clientX;
                  startWidthRef.current = notesWidth;
                  document.body.style.cursor = 'col-resize';
                  document.body.style.userSelect = 'none';
                }}
                className="w-1 cursor-col-resize bg-transparent hover:bg-blue-200"
                title="Drag to resize notes"
              />
              <div
                className="h-full bg-gray-50 flex-1 flex flex-col"
                style={{ width: showFindReplace ? stackedPanelWidth : notesWidth || stackedPanelWidth }}
              >
                <div className="px-3 pt-3 pb-1 text-xs font-semibold text-gray-600">Notes</div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Type your notes here..."
                  className="flex-1 w-full p-3 bg-transparent outline-none resize-none text-sm"
                />
              </div>
            </div>
          )}
        </div>
      )}
      {/* When Find or Notes is open, render Invalid Timestamps as a separate side panel */}
      {showInvalidList && (showFindReplace || showNotes) && (
        <div className="flex h-full flex-col border-l bg-white relative" style={{ width: invalidPanelWidth }}>
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              isResizingInvalidRef.current = true;
              startXInvalidRef.current = e.clientX;
              startWidthInvalidRef.current = invalidPanelWidth;
              document.body.style.cursor = 'col-resize';
              document.body.style.userSelect = 'none';
            }}
            title="Drag to resize invalid timestamps"
            style={{ position: 'absolute', left: -8, top: 0, bottom: 0, width: 12, zIndex: 9999, cursor: 'col-resize', background: 'linear-gradient(90deg, rgba(229,231,235,0.0), rgba(229,231,235,0.6))', pointerEvents: 'auto' }}
          />
          <div className="px-3 pt-3 pb-1 text-xs font-semibold text-gray-700 flex items-center justify-between">
            <span>Invalid Timestamps</span>
            <div className="flex items-center gap-2">
              <button
                className="w-8 h-8 flex items-center justify-center rounded-lg shadow bg-white text-blue-600 hover:bg-blue-50"
                title="Rebuild list"
                onClick={() => validateAllTimestamps()}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                className="w-8 h-8 flex items-center justify-center rounded-lg shadow bg-white text-yellow-700 hover:bg-yellow-50"
                title="Previous invalid timestamp"
                onClick={goToPrevInvalid}
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4L6 10l6 6"/></svg>
              </button>
              <div className="text-xs text-gray-600">{currentInvalidIndex + 1}/{invalidTimestampCount}</div>
              <button
                className="w-8 h-8 flex items-center justify-center rounded-lg shadow bg-white text-yellow-700 hover:bg-yellow-50"
                title="Next invalid timestamp"
                onClick={goToNextInvalid}
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 4l6 6-6 6"/></svg>
              </button>
            </div>
          </div>
          <div className="flex-1 p-3 space-y-2" style={{ maxHeight: invalidPanelMaxHeight + 'px', overflowY: 'auto' }}>
            {timestampInvalidsRef.current && timestampInvalidsRef.current.length > 0 ? (
              timestampInvalidsRef.current.map((it, i) => (
                <div key={i} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                  <div className="text-sm text-gray-800">{it.text}</div>
                  <div className="flex items-center gap-2">
                    <button
                      className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded"
                      onClick={() => { goToInvalidAt(i); }}
                    >
                      Go
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500">No invalid timestamps</div>
            )}
          </div>
        </div>
      )}
      
      <div className="ml-3 flex flex-col gap-2 py-2 pr-2">
        {/* Speaker snippets toggle */}
        <button
          className={`w-8 h-8 flex items-center justify-center rounded-lg shadow transition-colors ${showSpeakerSnippets ? 'bg-indigo-500 text-white' : 'bg-white text-indigo-500 hover:bg-indigo-100'}`}
          title="Speaker Snippets"
          onClick={() => setShowSpeakerSnippets(v => !v)}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M3 7v14l9-7z"/>
          </svg>
        </button>
        {/* Highlight repeated speakers button (placed with snippets) */}
        <div className="flex items-center space-x-2">
          <button
            className={`w-8 h-8 flex items-center justify-center rounded-lg shadow transition-colors ${showHighlightRepeated ? 'bg-indigo-500 text-white' : 'bg-white text-indigo-500 hover:bg-indigo-100'}`}
            title="Highlight Repeated Speakers"
            onClick={() => {
              const newState = !showHighlightRepeated;
              setShowHighlightRepeated(newState);
              highlightRepeatedSpeakers(newState);
            }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M3 10h4v11H3zM9 3h4v18H9zM15 7h4v14h-4z" />
            </svg>
          </button>

          {/* Prev/Next controls shown when highlights active */}
          {showHighlightRepeated && (repeatedPositionsRef.current?.length || 0) > 0 && (
            <>
              <button
                className="w-8 h-8 flex items-center justify-center rounded-lg shadow bg-white text-indigo-500 hover:bg-indigo-100"
                title="Previous repeated speaker"
                onClick={goToPrevRepeated}
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4L6 10l6 6"/></svg>
              </button>
              <button
                className="w-8 h-8 flex items-center justify-center rounded-lg shadow bg-white text-indigo-500 hover:bg-indigo-100"
                title="Next repeated speaker"
                onClick={goToNextRepeated}
              >
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 4l6 6-6 6"/></svg>
              </button>
            </>
          )}
          {/* Invalid timestamp navigation controls moved to vertical column */}
        </div>
          {/* Invalid timestamps list button (vertical group) */}
          <div className="relative flex items-center">
            <div className="relative">
              <button
                className={`w-8 h-8 flex items-center justify-center rounded-lg shadow transition-colors ${showInvalidList ? 'bg-indigo-500 text-white' : 'bg-white text-indigo-500 hover:bg-indigo-100'}`}
                title="Invalid Timestamps"
                onClick={() => {
                  setShowInvalidList(v => {
                    const next = !v;
                    if (next) {
                      // Build the list when opening the panel
                      setTimeout(() => validateAllTimestamps(), 0);
                    }
                    return next;
                  });
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M3 6h18M3 12h18M3 18h18" />
                </svg>
                {invalidTimestampCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 text-[10px] font-semibold text-white bg-yellow-600 rounded-full">{invalidTimestampCount}</span>
                )}
              </button>
            </div>

            {/* inline prev/next removed — controls live in right-side panel */}

            {/* dropdown removed — invalid list now opens in the right-side panel */}
          </div>
          {/* Toggle viewport validation */}
          <button
            className={`w-8 h-8 flex items-center justify-center rounded-lg shadow transition-colors ${validateTimestampsEnabled ? 'bg-green-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-100'}`}
            title="Toggle viewport timestamp validation"
            onClick={() => {
              setValidateTimestampsEnabled((prev) => {
                const next = !prev;
                if (next) {
                  // Enable continuous viewport validation
                  scheduleValidateViewportTimestamps(0);
                } else {
                  // Clear highlights when disabled
                  clearTimestampHighlights();
                }
                return next;
              });
            }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 3l7 4v6c0 3.9-2.7 7.4-7 8-4.3-.6-7-4.1-7-8V7z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </button>
          {/* Notes toggle */}
        <button
          className={`w-8 h-8 flex items-center justify-center rounded-lg shadow transition-colors ${showNotes ? 'bg-indigo-500 text-white' : 'bg-white text-indigo-500 hover:bg-indigo-100'}`}
          title="Notes"
          onClick={() => setShowNotes(v => !v)}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M7 8h10M7 12h10m-5 4h5"/>
          </svg>
        </button>
        {/* Find & Replace toggle */}
        <button
          className={`w-8 h-8 flex items-center justify-center rounded-lg shadow transition-colors ${showFindReplace ? 'bg-indigo-500 text-white' : 'bg-white text-indigo-500 hover:bg-indigo-100'}`}
          title="Find & Replace"
          onClick={() => setShowFindReplace(v => !v)}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="11" y1="7" x2="11" y2="15" />
            <line x1="7" y1="11" x2="15" y2="11" />
          </svg>
        </button>
      </div>
    </div>
  </div>
  );
});

export default Textarea;
