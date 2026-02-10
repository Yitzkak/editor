// App.js
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Toolbar from './components/Toolbar';
import Textarea from './components/Textarea';
import MediaPlayer from './components/MediaPlayer';
import FindReplaceModal from './components/FindReplaceModal';
import SwapSpeakerModal from './components/SwapSpeakerModal';
import VersionHistoryModal from './components/VersionHistoryModal';
import HomePage from './components/HomePage';


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
          />
        </div>

        {/* Textarea underneath the toolbar */}
        <div className="w-full bg-white mt-4 relative flex-1 min-h-0">
          <Textarea 
            ref={editorRef} 
            fontSize={fontSize} 
            transcript={transcript} 
            onTranscriptChange={handleTranscriptChange}
            onRequestSwapModal={handleRequestSwapModal}
            autosuggestionEnabled={autosuggestionEnabled}
            onRequestPlayRange={handleRequestPlayRange}
            onRequestStop={handleRequestStop}
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
