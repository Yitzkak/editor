import React, { useEffect, useState,useRef, useImperativeHandle, forwardRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

const predefinedWords = ['Objection, form.', 'Object to form', '[overlapping conversation]', '[laughter]', '[pause]', '[chuckle]', '[automated voice]', '[background conversation]', '[Foreign language]'];

const Textarea = forwardRef(({ fontSize, transcript, onTranscriptChange }, ref) => {
  const editorRef = useRef(null);
  const quillInstanceRef = useRef(null); // Store Quill instance here
  const [highlightedText, setHighlightedText] = useState('');
  const [selectionRange, setSelectionRange] = useState(null);
  const [suggestionPosition, setSuggestionPosition] = useState({ top: 0, left: 0 });

  const [suggestions, setSuggestions] = useState([]);
  const [currentInput, setCurrentInput] = useState('');

  const suggestionsRef = useRef(suggestions);

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
  
    const range = quillInstanceRef.current.getSelection();
    if (range && range.length > 0) {
      const selectedText = quillInstanceRef.current.getText(range.index, range.length);
      
      const transformedText = selectedText
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
  
      quillInstanceRef.current.deleteText(range.index, range.length); 
      quillInstanceRef.current.insertText(range.index, transformedText);
    }
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
    if (!quillInstanceRef.current) return [];
    const content = quillInstanceRef.current.getText();
    const words = new Set(content.match(/\b\w+\b/g));
    return [ ...predefinedWords];
  };

  const handleTextChange = () => {
    if (!quillInstanceRef.current) return;
    
    const quill = quillInstanceRef.current;
    const range = quill.getSelection();
    if (!range) return;
    
    const textBeforeCursor = quill.getText(0, range.index).trim().split(/\s+/).pop();
    setCurrentInput(textBeforeCursor);
    
    if (textBeforeCursor.length >= 3) {
      const possibleSuggestions = getWordsFromTranscript().filter(word =>
        word.toLowerCase().startsWith(textBeforeCursor.toLowerCase())
      );
      setSuggestions(possibleSuggestions);
  
      if (possibleSuggestions.length > 0) {
        const cursorBounds = quill.getBounds(range.index);
        setSuggestionPosition({ top: cursorBounds.top + 30, left: cursorBounds.left });
      }
    } else {
      setSuggestions([]); // Clear suggestions if less than 3 characters are typed
    }
  };

  const handleSuggestionSelect = (word, offset, event ) => {
    if (!quillInstanceRef.current) return;
  
    const quill = quillInstanceRef.current;
    
    // Ensure editor is focused
    quill.focus();
  
    // Get the current selection range again after focusing
    const range = quill.getSelection();
    if (!range) return; // Still null? Exit function.
  
    // Get the current text before the cursor position
    const textBeforeCursor = quill.getText(0, range.index);
    
    // Extract the last typed word
    const words = textBeforeCursor.trim().split(/\s+/);
    const lastWord = words[words.length - 1]; 
  
    // Find the start index of the last word
    const startIndex = range.index - lastWord.length;
  
    // Replace the last typed word with the selected suggestion
    quill.deleteText(startIndex - offset, lastWord.length);
    quill.insertText(startIndex - offset, word + " ");
    
    // Move cursor to the end of inserted word
    quill.setSelection((startIndex - offset) + word.length + 1 );
  
    // Clear suggestions
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

  // Expose the `insertTimestamp` method to the parent component
  useImperativeHandle(ref, () => ({
    insertTimestamp,
    findAndHighlight,
    replaceText,
    replaceAll,
    getText,
    replaceSpeakerLabel,
    swapSpeakerLabels, 
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
          handleSuggestionSelect(suggestionsRef.current[0], 1);
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
      if (event.key === 'Enter') {
        if (suggestionsRef?.current.length > 0) {
          event.preventDefault(); // Prevent default Enter behavior
          event.stopPropagation(); // Stop event propagation
      
          const firstSuggestion = suggestionsRef.current[0]; // Get first suggestion

          const offset = 1;
          handleSuggestionSelect(firstSuggestion, offset);
          // return false;
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

    quill.on('text-change', () => {
      handleTextChange();
      const range = quill.getSelection();
      if (range) {
        const textBeforeCursor = quill.getText(Math.max(0, range.index - 3), 3).trim();
        setCurrentInput(textBeforeCursor);
        
        if (textBeforeCursor.length >= 3) {
          const possibleSuggestions = getWordsFromTranscript().filter(word =>
            word.toLowerCase().startsWith(textBeforeCursor.toLowerCase())
          );
          setSuggestions(possibleSuggestions);
      
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
    };
  }, [fontSize]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (editorRef.current && !editorRef.current.contains(event.target)) {
        setSuggestions([]);
      }
    };
  
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    } 
  }, []);

  return (
    <div className="w-full h-[460px] shadow-lg border relative">
      {/* Quill editor container */}
      <div
        ref={editorRef}
        className="font-monox bg-white rounded-md h-full break-words word-space-2 whitespace-pre-wrap"
      ></div>
      {suggestions.length > 0 && (
        <div
          className="absolute bg-white border shadow-lg rounded p-2 text-sm"
          style={{ top: suggestionPosition.top, left: suggestionPosition.left, position: 'absolute' }}
        >
          {suggestions.map((word, index) => (
            <div key={index} 
            onClick={() => handleSuggestionSelect(word, 0)} 
            className="hover:bg-gray-200 p-1 cursor-pointer">{word}</div>
          ))}
        </div>
      )}
    </div>
  );
});

export default Textarea;
