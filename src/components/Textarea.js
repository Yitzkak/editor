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
  const [timestampIndex, setTimestampIndex] = useState([]);
  const [onTimestampClick, setOnTimestampClick] = useState(null);

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
    const textBeforeCursor = quill.getText(0, range.index);
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
  const insertTimestamp = (timestamp) => {
    if (!quillInstanceRef.current) return;

    // Get the current selection
    const range = quillInstanceRef.current.getSelection();
    if (range) {
        // Check if it's the start of a paragraph
        const isStartOfParagraph = range.index === 0 || quillInstanceRef.current.getText(range.index - 1, 1) === "\n";
        const formattedTimestamp = isStartOfParagraph ? `${timestamp} S1: ` : `[${timestamp}] ____ `;

        // Insert the timestamp at the selection index
        quillInstanceRef.current.insertText(range.index, formattedTimestamp);

        // Calculate the position of "S1" number (right after "S")
        const highlightStart = range.index + timestamp.length + 2; // Position of the number after "S"
        const highlightEnd = highlightStart + 1; // Select just the number (e.g., "1")

        // Set selection to highlight the number after "S"
        quillInstanceRef.current.setSelection(highlightStart, 1);
    }
  };

  const findAndHighlight = (text, caseSensitive = false) => {
    if (!quillInstanceRef.current) return;
    const content = quillInstanceRef.current.getText();
    const flags = caseSensitive ? '' : 'i';
    const regex = new RegExp(text, flags);
    const match = content.match(regex);
    if (match) {
      const index = match.index;
      quillInstanceRef.current.setSelection(index, text.length);
      quillInstanceRef.current.formatText(index, text.length, { background: 'yellow' });
    } else {
      alert('Text not found.');
    }
  };

  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  const replaceText = (findText, replaceText, caseSensitive = false) => {
    if (!quillInstanceRef.current) return;
    const escapedFindText = escapeRegExp(findText);
    const flags = caseSensitive ? '' : 'i';
    const regex = new RegExp(escapedFindText, flags);
    const content = quillInstanceRef.current.getText();
    const match = content.match(regex);
    if (match) {
      const index = match.index;
      quillInstanceRef.current.deleteText(index, findText.length);
      quillInstanceRef.current.insertText(index, replaceText);
    } else {
      alert('Text not found.');
    }
  };

  const getText = () => {
    if (!quillInstanceRef.current) return;
    return quillInstanceRef.current.getText();
  };

  const replaceAll = (findText, replaceText, caseSensitive = false) => {
    if (!quillInstanceRef.current) return;
    const escapedFindText = escapeRegExp(findText);
    const flags = 'g' + (caseSensitive ? '' : 'i');
    const regex = new RegExp(escapedFindText, flags);
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

  // Expose the `insertTimestamp` method to the parent component
  useImperativeHandle(ref, () => ({
    insertTimestamp,
    findAndHighlight,
    replaceText,
    replaceAll,
    getText,
    replaceSpeakerLabel,
    swapSpeakerLabels,
    navigateToTime,
    makeTimestampsClickable,
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

  useEffect(() => {
    if (!editorRef.current) return; // Exit if editorRef is not ready

    // Initialize Quill
    const quill = new Quill(editorRef.current, {
      theme: 'bubble',
      modules: {
        toolbar: false, // Disable the toolbar
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
    quill.focus(); // Ensure the editor is focused for typing
    let lastHighlightedRange = null; // Store last highlighted range

    // Remove highlight when clicking inside the editor
    const handleEditorClick = () => {
      console.log('Clicked inside the editor');
      if (lastHighlightedRange) {
        // Remove highlight when clicking inside the editor
        // quill.formatText(lastHighlightedRange.index, lastHighlightedRange.length, { background: false });
        lastHighlightedRange = null; // Reset the stored range
      }
      //setHighlightedText(""); // Reset highlighted text when clicking inside the editor
    };

    const handleKeyDown = (event) => {
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

    // quill.on('selection-change', handleSelectionChange);
    quill.root.addEventListener('click', handleEditorClick);
    quill.root.addEventListener('keydown', handleKeyDown);
    quill.root.addEventListener('contextmenu', handleEditorRightClick);

    quill.on('text-change', () => {
      handleTextChange();
      const range = quill.getSelection();
      if (range) {
        const textBeforeCursor = quill.getText(0, range.index);
        // Use word boundary detection to find the current word being typed
        const match = textBeforeCursor.match(/\b\w*$/);
        const prefix = match ? match[0] : '';
        setCurrentInput(prefix);
        let allSuggestions = [];
        let displayToOriginal = {};
        if (autosuggestionEnabled) {
          const result = getWordsFromTranscript();
          allSuggestions = result.suggestions;
          displayToOriginal = result.displayToOriginal;
        } else {
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
          const results = fuse.search(prefix);
          const possibleSuggestions = Array.from(new Set(results.map(r => r.item)));
          setSuggestions(possibleSuggestions);
          handleTextChange.displayToOriginal = displayToOriginal;
          if (possibleSuggestions.length > 0) {
            const cursorBounds = quill.getBounds(range.index);
            setSuggestionPosition({ top: cursorBounds.top + 30, left: cursorBounds.left });
          }
        } else {
          setSuggestions([]); // Clear suggestions
        }
      }
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
    return /[.!?…]$/.test(str.trim());
  }

  // Helper: finds the first sentence-ending punctuation in a string
  function findFirstSentenceEnd(str) {
    // Find the first occurrence of ., ?, !, or ...
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
        if (fixedLines.length > 0 && !endsWithPunctuation(fixedLines[fixedLines.length - 1])) {
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
      while (j < lines.length) {
        let nextLine = lines[j];
        if (!nextLine.trim()) {
          merged += ' ';
          j++;
          continue;
        }
        if (isSpeakerLine(nextLine)) {
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
      if (j >= lines.length) {
        fixedLines.push(merged.trim());
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
    // Pick up to snippetCount evenly spaced
    const pickEven = (arr, k) => {
      if (arr.length <= k) return arr;
      const result = [];
      const step = (arr.length - 1) / (k - 1);
      for (let i = 0; i < k; i++) {
        const idx = Math.round(i * step);
        result.push(arr[idx]);
      }
      // de-duplicate in case rounding collided
      const seen = new Set();
      return result.filter(it => {
        const key = it.index;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };
    const snippets = {};
    const order = Object.keys(bySpeaker).sort();
    order.forEach(sp => {
      snippets[sp] = pickEven(bySpeaker[sp], snippetCount);
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

  return (
    <div className="w-full h-[460px] shadow-lg border relative">
      {/* Editor + Notes layout */}
      <div className="flex h-full">
        {/* Quill editor container */}
        <div
          ref={editorRef}
          className="flex-1 font-monox bg-white rounded-md h-full break-words word-space-2 whitespace-pre-wrap"
          title="Right-click on timestamps (like '0:00:36.4 S2:') to play audio from that point"
        ></div>
        {/* Speaker snippets panel (conditionally shown) */}
        {showSpeakerSnippets && (
          <>
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
                      <input
                        type="text"
                        className="border rounded px-1 py-[1px] text-xs w-24"
                        value={speakerNames[sp] || ''}
                        onChange={e => {
                          setSpeakerNames(prev => ({ ...prev, [sp]: e.target.value }));
                        }}
                        placeholder="Name"
                        title="Enter speaker name"
                      />
                      <span className="text-gray-400">- audio snippets</span>
                    </div>
                    <div className="p-2 flex flex-wrap gap-2">
                      {(speakerSnippets[sp] || []).map((snip, idx) => (
                        <button
                          key={idx}
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
              </div>
            </div>
          </div>
          </>
        )}
        {showNotes && (
          <>
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
            <div className="h-full border-l bg-gray-50" style={{ width: notesWidth }}>
            <div className="h-full flex flex-col">
              <div className="px-3 pt-3 pb-1 text-xs font-semibold text-gray-600">Notes</div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Type your notes here..."
                className="flex-1 w-full p-3 bg-transparent outline-none resize-none text-sm"
              />
            </div>
            </div>
          </>
        )}
      </div>
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
                      const m2 = paragraphs[j].match(/^((\d{1,2}:){2}\d{1,2}(?:\.\d+)?)[\s]+S\d+:/);
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
  );
});

export default Textarea;
