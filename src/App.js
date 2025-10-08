// App.js
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Toolbar from './components/Toolbar';
import Textarea from './components/Textarea';
import MediaPlayer from './components/MediaPlayer';
import FindReplaceModal from './components/FindReplaceModal';
import SwapSpeakerModal from './components/SwapSpeakerModal';


function App() {
  const [mediaFile, setMediaFile] = useState(null);
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
  const [audioLoading, setAudioLoading] = useState(false);
  const [autosuggestionEnabled, setAutosuggestionEnabled] = useState(true);
  const [performanceMode, setPerformanceMode] = useState(false); // Hide waveform for >3h files

  // State for trigger buttons
  const [showSpeakerSnippets, setShowSpeakerSnippets] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [detectedSpeakerCount, setDetectedSpeakerCount] = useState(0);

  const [audioContext, setAudioContext] = useState(null);
  const [gainNode, setGainNode] = useState(null);
  const [gainValue, setGainValue] = useState(1); // Default gain is 1 (normal volume)

  // Swap Speaker Modal state
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [fromLabel, setFromLabel] = useState('S1');
  const [toLabel, setToLabel] = useState('S2');

  const editorRef = useRef(null);
  const mediaPlayerRef = useRef(null);
  const playRangeTimerRef = useRef(null);

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
  const togglePlayPause = () => mediaPlayerRef.current?.togglePlayPause();
  const skipBack = () => {
    mediaPlayerRef.current?.skipBack(5); // Skip back 5 seconds
    mediaPlayerRef.current?.playAudio();
    return true;
  } 
  // Function to handle skip forward
  const skipForward = () => {
    mediaPlayerRef.current?.skipForward(5); // Skip forward 5 seconds
    mediaPlayerRef.current?.playAudio();
    return true;
  }
  
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

  const getTimestamp = () => mediaPlayerRef.current?.getTimestamp();
  const insertTimestamp = (timestamp) => editorRef.current?.insertTimestamp(timestamp);

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
      editorRef.current.findAndHighlight(findText, caseSensitive);
    }
  };
  
  const handleReplace = () => {
    if (editorRef.current && findText && replaceText) {
      editorRef.current.replaceText(findText, replaceText, caseSensitive);
    }
  };
  
  const handleReplaceAll = () => {
    if (editorRef.current && findText && replaceText) {
      editorRef.current.replaceAll(findText, replaceText, caseSensitive);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check for specific key combinations and call corresponding functions
      if (e.shiftKey && e.code === "Tab") {
        e.preventDefault(); // Prevent default tabbing behavior
        togglePlayPause(); // Play/Pause
      }
  
      if (e.ctrlKey && e.shiftKey && e.code === "ControlLeft" || e.code === "ControlRight") {
        e.preventDefault();
        const timestamp = getTimestamp();
        if (timestamp) {
          insertTimestamp(timestamp); // Insert Timestamp
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
  }, [togglePlayPause, getTimestamp, insertTimestamp, skipBack, skipForward]);

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

  // Handle toggle speaker snippets
  const handleToggleSpeakerSnippets = () => {
    if (editorRef.current) {
      editorRef.current.toggleSpeakerSnippets();
      setShowSpeakerSnippets(!showSpeakerSnippets);
    }
  };

  // Handle toggle notes
  const handleToggleNotes = () => {
    if (editorRef.current) {
      editorRef.current.toggleNotes();
      setShowNotes(!showNotes);
    }
  };

  return (
    <div className="flex justify-center min-w-96  bg-gray-100 p-[5px] h-screen relative" >
      <div className="flex flex-col max-h-full items-center w-full max-w-6xl rounded-sm">
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
        <div className="mt-3">
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
            toggleFindReplace={toggleFindReplace}
            handleAmplificationChange={handleAmplificationChange}
            amplification={amplification}
            downloadTranscript={downloadTranscript}
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
            autosuggestionEnabled={autosuggestionEnabled}
            setAutosuggestionEnabled={setAutosuggestionEnabled}
          />
        </div>

        {/* Textarea underneath the toolbar */}
        <div className="w-full bg-white mt-4 relative">
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
          {/* Stacked square triggers positioned outside the text area */}
          <div className="absolute -top-2 -right-2 z-50 flex flex-col gap-1">
            {/* Audio Snippets trigger - always visible */}
            <button
              type="button"
              onClick={handleToggleSpeakerSnippets}
              className={`w-8 h-8 flex items-center justify-center text-white text-xs font-semibold shadow-lg border-2 border-white rounded-sm ${
                showSpeakerSnippets 
                  ? 'bg-indigo-600 hover:bg-indigo-700' 
                  : 'bg-indigo-500 hover:bg-indigo-600'
              }`}
              aria-pressed={showSpeakerSnippets}
              aria-label="Toggle speaker snippets"
              title={showSpeakerSnippets ? 'Hide Speaker Snippets' : `Show Speaker Snippets (${detectedSpeakerCount} speakers)`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 19V6l12-2v13"/>
                <rect x="3" y="10" width="4" height="10" rx="1"/>
              </svg>
            </button>
            {/* Notes trigger */}
            <button
              type="button"
              onClick={handleToggleNotes}
              className={`w-8 h-8 flex items-center justify-center text-white text-xs font-semibold shadow-lg border-2 border-white rounded-sm ${
                showNotes 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
              aria-pressed={showNotes}
              aria-label="Toggle notes panel"
              title={showNotes ? 'Hide Notes' : 'Show Notes'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10,9 9,9 8,9"/>
              </svg>
            </button>
          </div>
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
      </div>
    </div>
  );
}

export default App;
