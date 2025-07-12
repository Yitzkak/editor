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

const Textarea = forwardRef(({ fontSize, transcript, onTranscriptChange, onRequestSwapModal, autosuggestionEnabled }, ref) => {
  const editorRef = useRef(null);
  const quillInstanceRef = useRef(null); // Store Quill instance here
  const [highlightedText, setHighlightedText] = useState('');
  const [selectionRange, setSelectionRange] = useState(null);
  const [suggestionPosition, setSuggestionPosition] = useState({ top: 0, left: 0 });

  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [currentInput, setCurrentInput] = useState('');

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
  });

  const contextMenuRef = useRef(null);

  const lastMenuOpenTimeRef = useRef(0);

  const inputPrefixRef = useRef('');

  const suggestionContextRef = useRef({ prefix: '', cursorIndex: 0 });

  // Add a ref for the suggestions popup
  const suggestionsBoxRef = useRef(null);

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

    // Get the entire transcript text
    const content = quillInstanceRef.current.getText();
    console.log('[formatTitleCase] Full content:', content);

    // Split into lines to handle multi-line transcript
    const lines = content.split(/(\r?\n)/);
    const transformedLines = lines.map(line => {
      if (/^\r?\n$/.test(line)) return line;
      let processed = line;
      // Capitalize after timestamp+speaker label
      processed = processed.replace(/((\d{1,2}:){2}\d{1,2}(?:\.\d+)?\s+S\d+:\s*)([a-zA-Z])/, (m, p1, _p2, p3) => {
        console.log('[formatTitleCase] Speaker label match:', m, '->', p1 + p3.toUpperCase());
        return p1 + p3.toUpperCase();
      });
      // Capitalize after . ? ! (sentence boundaries)
      processed = processed.replace(/([.!?]\s+)([a-zA-Z])/g, (m, p1, p2) => {
        console.log('[formatTitleCase] Sentence boundary match:', m, '->', p1 + p2.toUpperCase());
        return p1 + p2.toUpperCase();
      });
      // Capitalize first non-space character of the line
      processed = processed.replace(/(^\s*[a-zA-Z])/, m => {
        console.log('[formatTitleCase] Line start match:', m, '->', m.toUpperCase());
        return m.toUpperCase();
      });
      return processed;
    });
    const transformedText = transformedLines.join("");
    console.log('[formatTitleCase] Final transformed text:', transformedText);
    quillInstanceRef.current.setText(transformedText);
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
    const match = textBeforeCursor.match(/[ 0-\uFFFF\p{L}\p{N}]+$/u);
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
      const results = fuse.search(prefix);
      const possibleSuggestions = Array.from(new Set(results.map(r => r.item)));
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
    const startIndex = cursorIndex - prefix.length;
    console.log('--- insertSuggestionAtContext DEBUG ---');
    console.log('Selected suggestion:', word);
    console.log('Original word to insert:', originalWord);
    console.log('Stored prefix:', prefix);
    console.log('Stored cursor index:', cursorIndex);
    console.log('Start index for deletion:', startIndex);
    if (prefix.length >= 3) {
      quill.deleteText(startIndex, prefix.length);
      quill.insertText(startIndex, originalWord + ' ');
      quill.setSelection(startIndex + originalWord.length + 1);
    } else {
      quill.insertText(cursorIndex, originalWord + ' ');
      quill.setSelection(cursorIndex + originalWord.length + 1);
    }
    console.log('Editor content after insertion:', quill.getText());
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
    if (timestampMatch || showGoogle || showSwapSpeaker) {
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
  }));

  useEffect(() => {
    suggestionsRef.current = suggestions;
  }, [suggestions]);

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

    quill.keyboard.addBinding(
      { key: 13 }, // Enter key
      function () {
        console.log('key binding done');
        if (suggestionsRef.current?.length > 0) {
          insertSuggestionAtContext(suggestionsRef.current[0]);
          return false; // Prevents default Enter behavior
        }
        return true; // Allows Enter if no suggestions
      }
    );

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
        } else if (event.key === 'Tab' || event.key === 'Enter') {
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
        formatTitleCase(); // Function to capitalize first letter of each word
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
        const prefix = textBeforeCursor.split(/\s+/).pop();
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

  return (
    <div className="w-full h-[460px] shadow-lg border relative">
      {/* Quill editor container */}
      <div
        ref={editorRef}
        className="font-monox bg-white rounded-md h-full break-words word-space-2 whitespace-pre-wrap"
        title="Right-click on timestamps (like '0:00:36.4 S2:') to play audio from that point"
      ></div>
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
        </div>
      )}
    </div>
  );
});

export default Textarea;
