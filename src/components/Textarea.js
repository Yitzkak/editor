import React, { useEffect, useState,useRef, useImperativeHandle, forwardRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

const Textarea = forwardRef(({ fontSize, transcript, onTranscriptChange }, ref) => {
  const editorRef = useRef(null);
  const quillInstanceRef = useRef(null); // Store Quill instance here
  const [highlightedText, setHighlightedText] = useState('');
  const [selectionRange, setSelectionRange] = useState(null);

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

      // Ensure the editor remains focused
      //quillInstanceRef.current.focus();
    }
  };

  const findAndHighlight = (text) => {
    if (!quillInstanceRef.current) return;
  
    const content = quillInstanceRef.current.getText();
    const regex = new RegExp(`\\b${text}\\b`); // Match whole words only
    const match = content.match(regex);
  
    if (match) {
      const index = match.index;
      quillInstanceRef.current.setSelection(index, text.length);
      quillInstanceRef.current.formatText(index, text.length, { background: 'yellow' });
    } else {
      alert('Whole word not found.');
    }
  };

  const replaceText = (findText, replaceText) => {
    if (!quillInstanceRef.current) return;
  
    const content = quillInstanceRef.current.getText();
    const regex = new RegExp(`\\b${findText}\\b`); // Match whole words only
    const match = content.match(regex);
  
    if (match) {
      const index = match.index;
      quillInstanceRef.current.deleteText(index, findText.length);
      quillInstanceRef.current.insertText(index, replaceText);
    } else {
      alert('Whole word not found.');
    }
  };

  const getText = () => {
    if (!quillInstanceRef.current) return;
    return quillInstanceRef.current.getText();
  };

  const replaceAll = (findText, replaceText) => {
    if (!quillInstanceRef.current) return;
  
    const regex = new RegExp(`\\b${findText}\\b`, 'g'); // Global match for whole words
    const content = quillInstanceRef.current.getText();
  
    let match;
    while ((match = regex.exec(content)) !== null) {
      const index = match.index;
      quillInstanceRef.current.deleteText(index, findText.length);
      quillInstanceRef.current.insertText(index, replaceText);
  
      // Adjust the regex index to account for the length difference
      regex.lastIndex += replaceText.length - findText.length;
    }
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
    // Initialize Quill
    const quill = new Quill(editorRef.current, {
      theme: 'bubble',
      modules: {
        toolbar: false, // Disable the toolbar
      },
      placeholder: 'Start typing your transcription here...',
    });

    // Assign the Quill instance to the ref
    quillInstanceRef.current = quill;

    quill.focus(); // Ensure the editor is focused for typing

    let lastHighlightedRange = null; // Store last highlighted range

    //Add a blue highlight when the editor loses focus
    // And loses the blue highlight color. 
    // const handleSelectionChange = (range, oldRange, source) => {
    //   if (!range && oldRange) {
         // Quill is about to lose focus
    //     const text = quill.getText(oldRange.index, oldRange.length);
    //     if (text.trim() !== "") {
    //       lastHighlightedRange = oldRange; // Store highlighted range
    //       quill.formatText(oldRange.index, oldRange.length, { background: '#FFEB3B' });
    //     }
    //   }
    // };

    // Remove highlight when clicking inside the editor
    const handleEditorClick = () => {
      if (lastHighlightedRange) {
        // Remove highlight when clicking inside the editor
        // quill.formatText(lastHighlightedRange.index, lastHighlightedRange.length, { background: false });
        lastHighlightedRange = null; // Reset the stored range
      }
      //setHighlightedText(""); // Reset highlighted text when clicking inside the editor
      
    };
    // quill.on('selection-change', handleSelectionChange);
    quill.root.addEventListener('click', handleEditorClick);


    // Set fixed height and custom font
    const editorContainer = editorRef.current.querySelector('.ql-editor'); // Access the Quill editor content
    if (editorContainer) {
      editorContainer.style.font = `${fontSize}px "Poppins", sans-serif`; // Set font size and family
      editorContainer.style.padding = '20px'; // Set padding to 20px
      editorContainer.style.setProperty('line-height', '30px', 'important'); // Adjust line height for better readability
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
      // quill.off('selection-change', handleSelectionChange);
      quill.root.removeEventListener('click', handleEditorClick);
    };
  }, [fontSize]);

  return (
    <div className="w-full h-[460px] shadow-lg border">
      {/* Quill editor container */}
      <div
        ref={editorRef}
        className="font-poppins bg-white rounded-md h-full break-words word-space-2 whitespace-pre-wrap"
      ></div>
    </div>
  );
});

export default Textarea;
