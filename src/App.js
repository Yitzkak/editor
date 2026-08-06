// App.js
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Toolbar from './components/Toolbar';
import Textarea from './components/Textarea';
import MediaPlayer from './components/MediaPlayer';
import FindReplaceModal from './components/FindReplaceModal';
import SwapSpeakerModal from './components/SwapSpeakerModal';
import VersionHistoryModal from './components/VersionHistoryModal';
import HomePage from './components/HomePage';
import FormattingToolbar from './components/FormattingToolbar';


function App() {
  const [mediaFile, setMediaFile] = useState(null);
  const [route, setRoute] = useState(() => window.location.hash || '#/');
  const [volume, setVolume] = useState(1);
  const [fontSize, setFontSize] = useState(16);
  const [transcript, setTranscript] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [amplification, setAmplification] = useState(1);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0); // Default 100%
  const [currentTime, setCurrentTime] = useState(0);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(true);
  const [audioLoading, setAudioLoading] = useState(false);
  const [autosuggestionEnabled, setAutosuggestionEnabled] = useState(true);
  const [autoCapitalizationEnabled, setAutoCapitalizationEnabled] = useState(() => {
    try {
      return localStorage.getItem('autoCapitalizationEnabled') !== 'false';
    } catch (e) {
      return true;
    }
  });
  const [autoCapEllipsisEnabled, setAutoCapEllipsisEnabled] = useState(() => {
    try {
      return localStorage.getItem('autoCapEllipsisEnabled') !== 'false';
    } catch (e) {
      return true;
    }
  });
  const [performanceMode, setPerformanceMode] = useState(false); // Hide waveform for >3h files
  // Right-Ctrl timestamp behavior: when true, pressing Right Control inserts a proper timestamp S# regardless of cursor
  const [rightCtrlInsertProper, setRightCtrlInsertProper] = useState(() => {
    try {
      const v = localStorage.getItem('rightCtrlInsertProper');
      return v === 'true';
    } catch (e) {
      return false;
    }
  });
  const [rightCtrlSpeaker, setRightCtrlSpeaker] = useState(() => {
    try {
      const v = parseInt(localStorage.getItem('rightCtrlSpeaker'), 10);
      return Number.isFinite(v) && v > 0 ? v : 1;
    } catch (e) {
      return 1;
    }
  });

  // Alternating speakers for "Add timestamp to next paragraph" feature
  const [useAlternatingSpeakers, setUseAlternatingSpeakers] = useState(() => {
    try {
      return localStorage.getItem('useAlternatingSpeakers') === 'true';
    } catch (e) {
      return false;
    }
  });
  const [alternatingSpeakers, setAlternatingSpeakers] = useState(() => {
    try {
      const saved = localStorage.getItem('alternatingSpeakers');
      return saved ? JSON.parse(saved) : [1, 2];
    } catch (e) {
      return [1, 2];
    }
  });
  const alternatingSpeakerIndexRef = useRef(0);

  // State for trigger buttons
  const [showSpeakerSnippets, setShowSpeakerSnippets] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [detectedSpeakerCount, setDetectedSpeakerCount] = useState(0);

  // eslint-disable-next-line no-unused-vars
  const [audioContext, setAudioContext] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [gainNode, setGainNode] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [gainValue, setGainValue] = useState(1); // Default gain is 1 (normal volume)

  // Swap Speaker Modal state
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [fromLabel, setFromLabel] = useState('S1');
  const [toLabel, setToLabel] = useState('S2');

  // Version History state
  const [versions, setVersions] = useState(() => {
    const saved = localStorage.getItem('transcript_versions');
    return saved ? JSON.parse(saved) : [];
  });
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  // Formatting toolbar state
  const [showFormattingToolbar, setShowFormattingToolbar] = useState(false);
  const [formattingPosition, setFormattingPosition] = useState('below'); // 'below' | 'side'
  const [customerInstructions, setCustomerInstructions] = useState(() => {
    try { return localStorage.getItem('customerInstructions') || ''; } catch (e) { return ''; }
  });
  const [speakerMappings, setSpeakerMappings] = useState(() => {
    try {
      const saved = localStorage.getItem('speakerMappings');
      return saved ? JSON.parse(saved) : [{ label: 'S1', name: '' }, { label: 'S2', name: '' }];
    } catch (e) {
      return [{ label: 'S1', name: '' }, { label: 'S2', name: '' }];
    }
  });

  const editorRef = useRef(null);
  const mediaPlayerRef = useRef(null);
  const playRangeTimerRef = useRef(null);

  useEffect(() => {
    const handleHashChange = () => setRoute(window.location.hash || '#/');
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (!route.startsWith('#/editor')) return;
    try {
      const payloadRaw = localStorage.getItem('scriptorfi_editor_payload');
      if (!payloadRaw) return;
      const payload = JSON.parse(payloadRaw);
      if (payload?.text) {
        setTranscript(payload.text);
      }
      if (payload?.fileName) {
        document.title = `Editor · ${payload.fileName}`;
      }
      localStorage.removeItem('scriptorfi_editor_payload');
    } catch (e) {
      // Ignore parse errors
    }
  }, [route]);

  const handleIncrease = () => {
    if (mediaPlayerRef.current) {
      mediaPlayerRef.current.volume = Math.min(1, mediaPlayerRef.current.volume + 0.1);
    }
  };

  const handleDecrease = () => {
    if (mediaPlayerRef.current) {
      mediaPlayerRef.current.volume = Math.max(0, mediaPlayerRef.current.volume - 0.1);
    }
  };

  const handleAmplificationChange = (e) => {
    const value = parseFloat(e.target.value);
    setAmplification(value);
    mediaPlayerRef.current.updateAmplification(value);
  };

  // Function to handle file selection
  const handleFileUpload = (file) => {
    console.log('[App] handleFileUpload: file selected', file?.name, file?.type, file?.size);
    setAudioLoading(true);
    setMediaFile(file);
  };

  // Function to handle play/pause
  const togglePlayPause = useCallback(() => mediaPlayerRef.current?.togglePlayPause(), []);
  const skipBack = useCallback(() => {
    mediaPlayerRef.current?.skipBack(5); // Skip back 5 seconds
    mediaPlayerRef.current?.playAudio();
    return true;
  }, []); 
  // Function to handle skip forward
  const skipForward = useCallback(() => {
    mediaPlayerRef.current?.skipForward(5); // Skip forward 5 seconds
    mediaPlayerRef.current?.playAudio();
    return true;
  }, []);
  
  const goToStart = () => mediaPlayerRef.current?.seekTo(0);
  const goToEnd = () => mediaPlayerRef.current?.goToEnd(); 

  // Volume controls
  const increaseVolume = () => {
    setVolume((prev) => {
      const newVolume = Math.min(prev + 0.1, 1);
      return Math.round(newVolume * 10) / 10; // Round to one decimal place
    });
  };

  function decreaseVolume() {
    setVolume((prevVolume) => {
      // Decrease volume but ensure it never goes below 0
      const newVolume = Math.max(prevVolume - 0.1, 0);
      return Math.round(newVolume * 10) / 10; // Round to one decimal place
    });
  }

  // Font size control
  const increaseFontSize = () => setFontSize(fontSize + 1);
  const decreaseFontSize = () => setFontSize(Math.max(fontSize - 1, 10));

  // Function to handle text update from the Textarea component
  const handleTranscriptChange = (newTranscript) => {
    setTranscript(newTranscript);
  };

  const getTimestamp = useCallback(() => mediaPlayerRef.current?.getTimestamp(), []);
  const insertTimestamp = useCallback((timestamp, speakerNumber) => editorRef.current?.insertTimestamp(timestamp, speakerNumber), []);
  const insertTimestampForced = useCallback((timestamp, speakerNumber) => editorRef.current?.insertTimestampForced?.(timestamp, speakerNumber), []);
  const splitParagraphWithTimestamp = useCallback((timestamp, speakerNumber) => editorRef.current?.splitParagraphWithTimestamp?.(timestamp, speakerNumber), []);
  const addTimestampToNextParagraph = useCallback((timestamp, speakerNumber) => editorRef.current?.addTimestampToNextParagraph?.(timestamp, speakerNumber), []);

  // Handler for toolbar button - adds timestamp to next paragraph
  const handleAddTimestampToNextParagraph = useCallback(() => {
    const timestamp = getTimestamp();
    if (timestamp) {
      let speakerNum;
      if (useAlternatingSpeakers && alternatingSpeakers.length > 0) {
        speakerNum = alternatingSpeakers[alternatingSpeakerIndexRef.current];
        alternatingSpeakerIndexRef.current = (alternatingSpeakerIndexRef.current + 1) % alternatingSpeakers.length;
      } else {
        speakerNum = rightCtrlSpeaker;
      }
      addTimestampToNextParagraph(timestamp, speakerNum);
    }
  }, [getTimestamp, addTimestampToNextParagraph, rightCtrlSpeaker, useAlternatingSpeakers, alternatingSpeakers]);

  // Reset alternating speaker index
  const resetAlternatingSpeakerIndex = useCallback(() => {
    alternatingSpeakerIndexRef.current = 0;
  }, []);

  // Function to download the transcript
  const downloadTranscript = () => {
    const getTextContent = () => editorRef.current?.getText();
    const textContent =  getTextContent();
    const element = document.createElement('a');
    const file = new Blob([textContent], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'transcript.txt';
    document.body.appendChild(element); // Append to body to ensure it's clickable
    element.click(); // Trigger the download
    document.body.removeChild(element); // Clean up
  };

  // Function to save a version of the transcript
  const saveVersion = useCallback(() => {
    const getTextContent = () => editorRef.current?.getText();
    const textContent = getTextContent();
    if (!textContent || !textContent.trim()) return;

    const newVersion = {
      id: Date.now(),
      timestamp: Date.now(),
      content: textContent
    };

    setVersions(prevVersions => {
      const updatedVersions = [...prevVersions, newVersion];
      // Persist to localStorage with error handling
      try {
        localStorage.setItem('transcript_versions', JSON.stringify(updatedVersions));
      } catch (e) {
        if (e.name === 'QuotaExceededError') {
          console.warn('Cannot save version history: storage quota exceeded');
          // Keep only the most recent 5 versions
          const limitedVersions = updatedVersions.slice(-5);
          try {
            localStorage.setItem('transcript_versions', JSON.stringify(limitedVersions));
            return limitedVersions;
          } catch (retryError) {
            console.error('Failed to save even limited version history:', retryError);
          }
        } else {
          console.error('Error saving version history:', e);
        }
      }
      return updatedVersions;
    });
  }, []);

  // Autosave versions every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      saveVersion();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [saveVersion]);

  // Function to restore a version
  const restoreVersion = (versionId) => {
    const version = versions.find(v => v.id === versionId);
    if (!version || !editorRef.current) return;

    // Save current state as a new version before restoring
    saveVersion();

    // Restore the selected version
    editorRef.current.setText(version.content);
  };

  // Function to delete a version
  const deleteVersion = (versionId) => {
    setVersions(prevVersions => {
      const updatedVersions = prevVersions.filter(v => v.id !== versionId);
      // Persist to localStorage with error handling
      try {
        localStorage.setItem('transcript_versions', JSON.stringify(updatedVersions));
      } catch (e) {
        console.error('Error saving version history after deletion:', e);
      }
      return updatedVersions;
    });
  };

  // Function to format paragraph breaks in the transcript
  const formatParagraphBreaks = () => {
    const getTextContent = () => editorRef.current?.getText();
    const textContent = getTextContent();
    if (!textContent) return;

    // Save current version before formatting
    saveVersion();

    // Regular expression to match timestamp entries (e.g., "0:03:07.7 S2: That works.")
    // Pattern: time format followed by speaker label (S# or similar) followed by colon
    const timestampPattern = /(\d+:\d+:\d+\.\d+\s+S\d+:)/g;
    
    // Split by timestamp pattern while keeping the timestamps
    const parts = textContent.split(timestampPattern);
    
    let formattedText = '';
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 1) {
        // This is a timestamp
        if (i > 1) {
          formattedText += '\n\n'; // Add double newline before timestamp (except first one)
        }
        // Ensure there's a space after the colon
        formattedText += parts[i] + ' ';
      } else if (parts[i]) {
        // This is the text after timestamp, trim any leading/trailing spaces
        formattedText += parts[i].trim();
      }
    }
    
    // Set the formatted text back to the editor
    if (editorRef.current) {
      editorRef.current.setText(formattedText.trim());
    }
  };

  // Function to update the current time
  useEffect(() => {
    console.log('[App] performanceMode changed:', performanceMode);
  }, [performanceMode]);

  useEffect(() => {
    console.log('[App] audioLoading changed:', audioLoading);
  }, [audioLoading]);

  useEffect(() => {
    console.log('[App] mediaFile changed:', mediaFile?.name, mediaFile?.type, mediaFile?.size);
  }, [mediaFile]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (mediaPlayerRef.current) {
        const time = mediaPlayerRef.current.getCurrentTime();
        setCurrentTime(time);
      }
    }, 1000); // Update the time every second
  
    return () => clearInterval(interval); // Cleanup the interval on component unmount
  }, []);
  
  // Toggle Modal
  const toggleFindReplace = () => {
    setIsModalOpen(!isModalOpen);
  };

  const handleFind = () => {
    if (editorRef.current && findText) {
      editorRef.current.findAndHighlight(findText, caseSensitive, wholeWord);
    }
  };
  
  const handleReplace = () => {
    if (editorRef.current && findText && replaceText) {
      editorRef.current.replaceText(findText, replaceText, caseSensitive, wholeWord);
    }
  };
  
  const handleReplaceAll = () => {
    if (editorRef.current && findText && replaceText) {
      editorRef.current.replaceAll(findText, replaceText, caseSensitive, wholeWord);
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem('rightCtrlInsertProper', rightCtrlInsertProper ? 'true' : 'false');
    } catch (e) {}
  }, [rightCtrlInsertProper]);

  useEffect(() => {
    try {
      localStorage.setItem('rightCtrlSpeaker', String(rightCtrlSpeaker));
    } catch (e) {}
  }, [rightCtrlSpeaker]);

  useEffect(() => {
    try {
      localStorage.setItem('useAlternatingSpeakers', useAlternatingSpeakers ? 'true' : 'false');
    } catch (e) {}
  }, [useAlternatingSpeakers]);

  useEffect(() => {
    try {
      localStorage.setItem('autoCapitalizationEnabled', autoCapitalizationEnabled ? 'true' : 'false');
    } catch (e) {}
  }, [autoCapitalizationEnabled]);

  useEffect(() => {
    try {
      localStorage.setItem('autoCapEllipsisEnabled', autoCapEllipsisEnabled ? 'true' : 'false');
    } catch (e) {}
  }, [autoCapEllipsisEnabled]);

  useEffect(() => {
    try {
      localStorage.setItem('alternatingSpeakers', JSON.stringify(alternatingSpeakers));
    } catch (e) {}
  }, [alternatingSpeakers]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check for specific key combinations and call corresponding functions
      if (e.shiftKey && e.code === "Tab") {
        e.preventDefault(); // Prevent default tabbing behavior
        togglePlayPause(); // Play/Pause
      }
  
      // If Right-Ctrl pressed alone and the dropdown option is enabled, either insert a proper timestamp
      // if the cursor is at the start of a line, or split the paragraph otherwise.
      if (e.code === 'ControlRight' && rightCtrlInsertProper && !e.shiftKey) {
        e.preventDefault();
        const timestamp = getTimestamp();
        if (timestamp) {
          try {
            const atStart = !!editorRef.current?.isCursorAtStartOfParagraph?.();
            if (atStart) {
              // Insert proper timestamp and highlight speaker number
              insertTimestamp(timestamp, rightCtrlSpeaker);
            } else {
              // Cursor not at start — split paragraph and insert new paragraph with timestamp
              splitParagraphWithTimestamp(timestamp, rightCtrlSpeaker);
            }
          } catch (err) {
            // Fallback to splitting if anything goes wrong
            splitParagraphWithTimestamp(timestamp, rightCtrlSpeaker);
          }
        }
        return;
      }

      // Right-Ctrl (when checkbox unchecked) or Shift+Ctrl (either left or right) inserts timestamp conditionally depending on cursor.
      if ((e.code === 'ControlRight' && !rightCtrlInsertProper && !e.shiftKey) || (e.ctrlKey && e.shiftKey && (e.code === "ControlLeft" || e.code === "ControlRight"))) {
        e.preventDefault();
        const timestamp = getTimestamp();
        if (timestamp) {
          // Pass the configured speaker number so that if insertion is at paragraph start
          // the speaker label used will match the dropdown speaker choice.
          insertTimestamp(timestamp, rightCtrlSpeaker);
        }
      }
  
      if (e.shiftKey && e.code === "ArrowLeft") {
        e.preventDefault(); // Prevent default behavior
        skipBack(); // Skip Backwards
        //togglePlayPause();
      }
  
      if (e.shiftKey && e.code === "ArrowRight") {
        e.preventDefault(); // Prevent default behavior
        skipForward(); // Skip Forwards
        //togglePlayPause();  
      }
    };
  
    // Attach the event listener
    window.addEventListener("keydown", handleKeyDown);

    // Cleanup the listener on component unmount
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [togglePlayPause, getTimestamp, insertTimestamp, insertTimestampForced, splitParagraphWithTimestamp, skipBack, skipForward, rightCtrlInsertProper, rightCtrlSpeaker]);

  const handleReplaceSpeakerLabel = (fromLabel, toLabel) => {
    if (editorRef.current) {
      editorRef.current.replaceSpeakerLabel(fromLabel, toLabel);
    }
  };

  const handleSwapSpeakerLabels = (label1, label2) => {
    if (editorRef.current) {
      editorRef.current.swapSpeakerLabels(label1, label2);
    }
  };

  const handleSwapClick = () => {
    if (fromLabel && toLabel) {
      editorRef.current.swapSpeakerLabels(fromLabel, toLabel);
    }
  };

  const handleReplaceClick = () => {
    if (fromLabel && toLabel) {
      editorRef.current.replaceSpeakerLabel(fromLabel, toLabel);
    }
  };

  const handleRequestSwapModal = (selectedText) => {
    setShowSwapModal(true);
  };

  const handleWaveformClick = (time) => {
    console.log('App.js handleWaveformClick called with time:', time);
    console.log('editorRef.current exists:', !!editorRef.current);
    if (editorRef.current) {
      console.log('Calling editorRef.current.navigateToTime');
      editorRef.current.navigateToTime(time);
      console.log('navigateToTime called successfully');
    } else {
      console.log('editorRef.current is null');
    }
  };

  const handleTimestampClick = (time) => {
    if (mediaPlayerRef.current) {
      mediaPlayerRef.current.seekTo(time);
      mediaPlayerRef.current.playAudio();
    }
  };

  // Handle range playback from Textarea speaker snippets
  const handleRequestPlayRange = (startSeconds, durationSeconds) => {
    if (!mediaPlayerRef.current) return;
    // Clear any previous stop timer
    if (playRangeTimerRef.current) {
      clearTimeout(playRangeTimerRef.current);
      playRangeTimerRef.current = null;
    }
    mediaPlayerRef.current.seekTo(startSeconds || 0);
    mediaPlayerRef.current.playAudio();
    if (typeof durationSeconds === 'number' && durationSeconds > 0) {
      playRangeTimerRef.current = setTimeout(() => {
        mediaPlayerRef.current?.pauseAudio();
        playRangeTimerRef.current = null;
      }, Math.round(durationSeconds * 1000));
    }
  };

  const handleRequestStop = () => {
    if (playRangeTimerRef.current) {
      clearTimeout(playRangeTimerRef.current);
      playRangeTimerRef.current = null;
    }
    mediaPlayerRef.current?.pauseAudio();
  };

  // Enable bidirectional navigation when media is loaded
  useEffect(() => {
    if (editorRef.current && mediaFile) {
      editorRef.current.makeTimestampsClickable(handleTimestampClick);
    }
  }, [mediaFile]);

  // Amplification controls for modal
  const handleAmplifyIncrease = () => {
    setAmplification((prev) => Math.min(prev + 0.5, 5));
    if (mediaPlayerRef.current) {
      mediaPlayerRef.current.updateAmplification(Math.min(amplification + 0.5, 5));
    }
  };
  const handleAmplifyDecrease = () => {
    setAmplification((prev) => Math.max(prev - 0.5, 1));
    if (mediaPlayerRef.current) {
      mediaPlayerRef.current.updateAmplification(Math.max(amplification - 0.5, 1));
    }
  };

  // Fix capitalization handler
  const handleFixCapitalization = () => {
    if (!editorRef.current) return;
    if (editorRef.current.formatTitleCase) {
      editorRef.current.formatTitleCase();
    }
  };

  // Add a handler to trigger fixTranscript on the Textarea ref
  const handleFixTranscript = () => {
    if (editorRef.current && editorRef.current.fixTranscript) {
      editorRef.current.fixTranscript();
    }
  };

  // Add a handler to trigger joinParagraphs on the Textarea ref
  const handleJoinParagraphs = () => {
    if (editorRef.current && editorRef.current.joinParagraphs) {
      editorRef.current.joinParagraphs();
    }
  };

  // Add a handler to trigger removeActiveListeningCues on the Textarea ref
  const handleRemoveActiveListeningCues = () => {
    if (editorRef.current && editorRef.current.removeActiveListeningCues) {
      editorRef.current.removeActiveListeningCues();
    }
  };

  // Add a handler to trigger removeFillerWords on the Textarea ref
  const handleRemoveFillers = (fillers) => {
    if (editorRef.current && editorRef.current.removeFillerWords) {
      editorRef.current.removeFillerWords(fillers);
    }
  };

  // Persist speakerMappings and customerInstructions to localStorage
  useEffect(() => {
    try { localStorage.setItem('speakerMappings', JSON.stringify(speakerMappings)); } catch (e) {}
  }, [speakerMappings]);
  useEffect(() => {
    try { localStorage.setItem('customerInstructions', customerInstructions); } catch (e) {}
  }, [customerInstructions]);

  // Double space after sentence-ending punctuation (. ? !)
  const handleDoubleSpaceSentences = () => {
    if (!editorRef.current) return;
    const text = editorRef.current.getText();
    const transformed = text.replace(/([.?!])( )(?! )/g, (match, punct, space, offset, str) => {
      if (punct === '.') {
        // Skip decimal numbers: digit before period
        if (offset > 0 && /\d/.test(str[offset - 1])) return match;
        // Skip known abbreviations
        const wordBefore = str.substring(0, offset).match(/[A-Za-z]+$/)?.[0] || '';
        if (/^(Mr|Mrs|Ms|Dr|Prof|Jr|Sr|St|vs|etc|al|Inc|Corp|Ltd|Dept|est|approx|No|Vol|pp|Fig|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Mon|Tue|Wed|Thu|Fri|Sat|Sun|Ave|Blvd|Rd|Apt|Gov|Gen|Sgt|Lt|Col|Maj|Rev|Hon|Rep|Sen)$/i.test(wordBefore)) return match;
        // Skip single letter (initials): J. or U.S.A.
        if (/^[A-Za-z]$/.test(wordBefore)) return match;
      }
      return punct + '  ';
    });
    editorRef.current.setText(transformed);
  };

  // Double space after colon that follows a speaker label (ALL CAPS pattern)
  const handleDoubleSpaceSpeakerColon = () => {
    if (!editorRef.current) return;
    const text = editorRef.current.getText();
    // Match speaker labels (any capitalisation, with optional periods/spaces) followed by colon + single space
    const transformed = text.replace(
      /\b([A-Za-z][A-Za-z0-9]*(?:[\s.]+[A-Za-z0-9]+)*):( )(?! )/g,
      (match, label, space) => `${label}:  `
    );
    editorRef.current.setText(transformed);
  };

  // Convert ... (ellipsis) between words to  --
  const handleEllipsisToDash = () => {
    if (!editorRef.current) return;
    const text = editorRef.current.getText();
    const transformed = text.replace(/\s*\.\.\.\s*/g, ' -- ');
    editorRef.current.setText(transformed);
  };

  // Remove empty lines between paragraphs (collapse blank lines to a single newline)
  const handleRemoveEmptyLines = () => {
    if (!editorRef.current) return;
    const text = editorRef.current.getText() || '';
    const transformed = text.replace(/\n(?:[ \t]*\n)+/g, '\n');
    if (transformed !== text) {
      editorRef.current.setText(transformed);
    }
  };

  // Apply speaker name mappings: replace labels like "S1:" with "REAL NAME:" throughout document
  const handleApplySpeakerNames = () => {
    if (!editorRef.current) return;
    let text = editorRef.current.getText();
    speakerMappings.forEach(({ label, name }) => {
      if (label.trim() && name.trim()) {
        const escaped = label.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        text = text.replace(new RegExp(`\\b${escaped}:`, 'g'), `${name.trim()}:`);
      }
    });
    editorRef.current.setText(text);
  };

  // Convert blank timestamps "[0:35:22.9] ____" to (indiscernible)/(Indiscernible)
  // Capitalize when it starts a sentence (start of text/line, after . ? !, or after a speaker label)
  const replaceBlanksWithIndiscernible = (text) => {
    const blankPattern = /\[\d{1,2}:\d{2}:\d{2}(?:\.\d+)?\]\s*_{2,}/g;
    return text.replace(blankPattern, (match, offset, full) => {
      const before = full.slice(0, offset);
      const trimmedBefore = before.replace(/\s+$/, '');
      let capitalize = false;
      if (trimmedBefore.length === 0) {
        capitalize = true;
      } else if (/[.?!]$/.test(trimmedBefore)) {
        capitalize = true;
      } else {
        // Start of spoken line after a speaker label (e.g. "0:01:00.0 S1:" or "Tess:")
        const line = trimmedBefore.split('\n').pop() || '';
        if (/^(?:\d{1,2}:\d{2}:\d{2}(?:\.\d+)?\s+)?(?:S(?:\d+|\?)|[A-Za-z][\w.\s]*):\s*$/.test(line)) {
          capitalize = true;
        }
      }
      return capitalize ? '(Indiscernible)' : '(indiscernible)';
    });
  };

  const handleBlanksToIndiscernible = () => {
    if (!editorRef.current) return;
    const text = editorRef.current.getText() || '';
    const transformed = replaceBlanksWithIndiscernible(text);
    if (transformed !== text) {
      editorRef.current.setText(transformed);
    }
  };

  const handleUndo = () => {
    editorRef.current?.undo?.();
  };

  const handleRedo = () => {
    editorRef.current?.redo?.();
  };

  // Export transcript with speaker names applied and timestamps removed (does not modify editor)
  const handleExportWithSpeakerNames = () => {
    if (!editorRef.current) return;
    let text = editorRef.current.getText() || '';

    // Replace S1:/S2: etc. with mapped speaker names
    speakerMappings.forEach(({ label, name }) => {
      if (label.trim() && name.trim()) {
        const escaped = label.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        text = text.replace(new RegExp(`\\b${escaped}:`, 'g'), `${name.trim()}:`);
      }
    });

    // Strip line-start timestamps (e.g. "0:28:21.1 " before a speaker name)
    text = text.replace(/(^|\n)\d{1,2}:\d{2}:\d{2}(?:\.\d+)?\s+/g, '$1');

    // Convert blank timestamps to (indiscernible) with sentence casing
    text = replaceBlanksWithIndiscernible(text);

    const element = document.createElement('a');
    const file = new Blob([text], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'transcript.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(element.href);
  };

  // Add a handler to trigger highlightRepeatedSpeakers on the Textarea ref
  // eslint-disable-next-line no-unused-vars
  const handleHighlightRepeatedSpeakers = () => {
    if (editorRef.current && editorRef.current.highlightRepeatedSpeakers) {
      editorRef.current.highlightRepeatedSpeakers();
    }
  };

  // Handle toggle speaker snippets
  // eslint-disable-next-line no-unused-vars
  const handleToggleSpeakerSnippets = () => {
    if (editorRef.current) {
      editorRef.current.toggleSpeakerSnippets();
      setShowSpeakerSnippets(!showSpeakerSnippets);
    }
  };

  // Handle toggle notes
  // eslint-disable-next-line no-unused-vars
  const handleToggleNotes = () => {
    if (editorRef.current) {
      editorRef.current.toggleNotes();
      setShowNotes(!showNotes);
    }
  };

  const goToEditor = () => {
    window.location.hash = '#/editor';
  };

  const renderEditor = () => (
    <div className="flex flex-col min-w-0 bg-gray-100 p-1 h-screen relative">
      <div className="flex flex-col w-full h-full">
        <a
          href="#/"
          className="absolute right-4 top-4 z-50 rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5"
        >
          Home
        </a>
        {audioLoading && (
          <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 z-50">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 border-solid"></div>
            <span className="ml-4 text-white text-xl">Loading audio...</span>
          </div>
        )}
        {/* Media player at the top */}
        <div className="w-full">
          <MediaPlayer 
            ref={mediaPlayerRef} 
            mediaFile={mediaFile} 
            volume={volume || 1} 
            speed={playbackSpeed}
            performanceMode={performanceMode}
            setAudioLoading={setAudioLoading}
            onWaveformClick={handleWaveformClick}
          />
        </div>
        
        {/* Toolbar at the top, passing handleFileUpload */}
        <div className="mt-3 w-full">
          <Toolbar 
            onFileUpload={handleFileUpload}
            setPerformanceMode={setPerformanceMode}
            togglePlayPause={togglePlayPause}
            increaseVolume ={increaseVolume}
            decreaseVolume={decreaseVolume}
            volume={volume}
            skipBack={skipBack}
            skipForward={skipForward}
            goToStart={goToStart}
            goToEnd={goToEnd}
            increaseFontSize={increaseFontSize}
            decreaseFontSize={decreaseFontSize}
            transcript={transcript}
            currentTime={currentTime}
            onGetTimestamp={getTimestamp}
            onInsertTimestamp={insertTimestamp}
            onAddTimestampToNextParagraph={handleAddTimestampToNextParagraph}
            // Alternating speakers
            useAlternatingSpeakers={useAlternatingSpeakers}
            setUseAlternatingSpeakers={setUseAlternatingSpeakers}
            alternatingSpeakers={alternatingSpeakers}
            setAlternatingSpeakers={setAlternatingSpeakers}
            resetAlternatingSpeakerIndex={resetAlternatingSpeakerIndex}
            // Right-Ctrl timestamp behavior
            rightCtrlInsertProper={rightCtrlInsertProper}
            setRightCtrlInsertProper={setRightCtrlInsertProper}
            rightCtrlSpeaker={rightCtrlSpeaker}
            setRightCtrlSpeaker={setRightCtrlSpeaker}
            toggleFindReplace={toggleFindReplace}
            handleAmplificationChange={handleAmplificationChange}
            amplification={amplification}
            downloadTranscript={downloadTranscript}
            onSave={formatParagraphBreaks}
            onShowVersionHistory={() => setShowVersionHistory(true)}
            speed={playbackSpeed * 100} 
            onSpeedChange={setPlaybackSpeed}
            onReplaceSpeakerLabel={handleReplaceSpeakerLabel} 
            onSwapSpeakerLabels={handleSwapSpeakerLabels} 
            onIncrease={handleIncrease} 
            onDecrease={handleDecrease}
            // Modal management props
            showSwapModal={showSwapModal}
            setShowSwapModal={setShowSwapModal}
            fromLabel={fromLabel}
            toLabel={toLabel}
            setFromLabel={setFromLabel}
            setToLabel={setToLabel}
            handleSwapClick={handleSwapClick}
            handleReplaceClick={handleReplaceClick}
            handleAmplifyIncrease={handleAmplifyIncrease}
            handleAmplifyDecrease={handleAmplifyDecrease}
            onFixCapitalization={handleFixCapitalization}
            onFixTranscript={handleFixTranscript}
            onJoinParagraphs={handleJoinParagraphs}
            onRemoveActiveListeningCues={handleRemoveActiveListeningCues}
            onRemoveFillers={handleRemoveFillers}
            autosuggestionEnabled={autosuggestionEnabled}
            setAutosuggestionEnabled={setAutosuggestionEnabled}
            autoCapitalizationEnabled={autoCapitalizationEnabled}
            setAutoCapitalizationEnabled={setAutoCapitalizationEnabled}
            autoCapEllipsisEnabled={autoCapEllipsisEnabled}
            setAutoCapEllipsisEnabled={setAutoCapEllipsisEnabled}
            showFormattingToolbar={showFormattingToolbar && formattingPosition === 'below'}
            onToggleFormattingToolbar={() => {
              setFormattingPosition('below');
              setShowFormattingToolbar(v => formattingPosition === 'below' ? !v : true);
            }}
          />
        </div>

        {/* Formatting toolbar - shown below main toolbar when position is 'below' */}
        {showFormattingToolbar && formattingPosition === 'below' && (
          <div className="mt-2 w-full">
            <FormattingToolbar
              position="below"
              onTogglePosition={() => setFormattingPosition('side')}
              onDoubleSpaceSentences={handleDoubleSpaceSentences}
              onDoubleSpaceSpeakerColon={handleDoubleSpaceSpeakerColon}
              onEllipsisToDash={handleEllipsisToDash}
              onBlanksToIndiscernible={handleBlanksToIndiscernible}
              onRemoveEmptyLines={handleRemoveEmptyLines}
              onUndo={handleUndo}
              onRedo={handleRedo}
              speakerMappings={speakerMappings}
              setSpeakerMappings={setSpeakerMappings}
              onApplySpeakerNames={handleApplySpeakerNames}
              onExport={handleExportWithSpeakerNames}
            />
          </div>
        )}
        {/* Textarea */}
        <div className="w-full mt-4 relative flex-1 min-h-0">
          <Textarea 
            ref={editorRef} 
            fontSize={fontSize} 
            transcript={transcript} 
            onTranscriptChange={handleTranscriptChange}
            onRequestSwapModal={handleRequestSwapModal}
            autosuggestionEnabled={autosuggestionEnabled}
            autoCapitalizationEnabled={autoCapitalizationEnabled}
            autoCapEllipsisEnabled={autoCapEllipsisEnabled}
            onRequestPlayRange={handleRequestPlayRange}
            onRequestStop={handleRequestStop}
            speakerMappings={speakerMappings}
            setSpeakerMappings={setSpeakerMappings}
            onApplySpeakerNames={handleApplySpeakerNames}
          />
        </div>

        <FindReplaceModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          findText={findText}
          replaceText={replaceText}
          setFindText={setFindText}
          setReplaceText={setReplaceText}
          handleReplace={handleReplace}
          handleFind={handleFind}
          handleReplaceAll={handleReplaceAll}
          caseSensitive={caseSensitive}
          setCaseSensitive={setCaseSensitive}
          wholeWord={wholeWord}
          setWholeWord={setWholeWord}
        />

        {showSwapModal && (
          <SwapSpeakerModal
            onClose={() => setShowSwapModal(false)}
            handleReplaceClick={handleReplaceClick}
            handleSwapClick={handleSwapClick}
            fromLabel={fromLabel}
            toLabel={toLabel}
            setFromLabel={setFromLabel}
            setToLabel={setToLabel}
          />
        )}

        <VersionHistoryModal
          isOpen={showVersionHistory}
          onClose={() => setShowVersionHistory(false)}
          versions={versions}
          onRestore={restoreVersion}
          onDelete={deleteVersion}
        />
      </div>
    </div>
  );

  if (route.startsWith('#/editor')) {
    return renderEditor();
  }

  return <HomePage onStart={goToEditor} />;
}

export default App;
