// App.js
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Toolbar from './components/Toolbar';
import Textarea from './components/Textarea';
import AudioPlayer from './components/AudioPlayer';
import FindReplaceModal from './components/FindReplaceModal';


function App() {
  const [audioFile, setAudioFile] = useState(null);
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

  const [audioContext, setAudioContext] = useState(null);
  const [gainNode, setGainNode] = useState(null);
  const [gainValue, setGainValue] = useState(1); // Default gain is 1 (normal volume)

  const editorRef = useRef(null);
  const audioPlayerRef = useRef(null);

  const handleIncrease = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.volume = Math.min(1, audioPlayerRef.current.volume + 0.1);
    }
  };

  const handleDecrease = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.volume = Math.max(0, audioPlayerRef.current.volume - 0.1);
    }
  };

  const handleAmplificationChange = (e) => {
    const value = parseFloat(e.target.value);
    setAmplification(value);
    audioPlayerRef.current.updateAmplification(value);
  };

  // Function to handle file selection
  const handleFileUpload = (file) => {
    setAudioLoading(true);
    setAudioFile(file);
  };

  // Function to handle play/pause
  const togglePlayPause = () => audioPlayerRef.current?.togglePlayPause();
  const skipBack = () => {
    audioPlayerRef.current?.skipBack(5); // Skip back 5 seconds
    audioPlayerRef.current?.playAudio();
    return true;
  } 
  // Function to handle skip forward
  const skipForward = () => {
    audioPlayerRef.current?.skipForward(5); // Skip forward 5 seconds
    audioPlayerRef.current?.playAudio();
    return true;
  }
  
  const goToStart = () => audioPlayerRef.current?.seekTo(0);
  const goToEnd = () => audioPlayerRef.current?.goToEnd(); 

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

  const getTimestamp = () => audioPlayerRef.current?.getTimestamp();
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
    const interval = setInterval(() => {
      if (audioPlayerRef.current) {
        const time = audioPlayerRef.current.getCurrentTime();
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
    if (audioPlayerRef.current) {
      audioPlayerRef.current.seekTo(time);
      audioPlayerRef.current.playAudio();
    }
  };

  // Enable bidirectional navigation when audio is loaded
  useEffect(() => {
    if (editorRef.current && audioFile) {
      editorRef.current.makeTimestampsClickable(handleTimestampClick);
    }
  }, [audioFile]);

  return (
    <div className="flex justify-center min-w-96  bg-gray-100 p-[5px] h-screen" >
      <div className="flex flex-col max-h-full items-center w-full max-w-6xl rounded-sm">
        {audioLoading && (
          <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 z-50">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 border-solid"></div>
            <span className="ml-4 text-white text-xl">Loading audio...</span>
          </div>
        )}
        {/* Audio player at the top */}
        <div className="w-full">
          <AudioPlayer 
            ref={audioPlayerRef} 
            audioFile={audioFile} 
            volume={volume || 1} 
            speed={playbackSpeed}
            setAudioLoading={setAudioLoading}
            onWaveformClick={handleWaveformClick}
          />
        </div>
        
        {/* Toolbar at the top, passing handleFileUpload */}
        <div className="mt-3">
          <Toolbar 
            onFileUpload={handleFileUpload}
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
          />
        </div>

        {/* Textarea underneath the toolbar */}
        <div className="w-full bg-white mt-4">
          <Textarea 
            ref={editorRef} 
            fontSize={fontSize} 
            transcript={transcript} 
            onTranscriptChange={handleTranscriptChange} 
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
        />
      </div>
    </div>
  );
}

export default App;
