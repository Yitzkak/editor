// App.js
import React, { useState, useRef, useEffect } from 'react';
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
  const [text, setText] = useState(
    "Sample text to demonstrate find and replace functionality."
  );

  const [currentTime, setCurrentTime] = useState(0);
  const editorRef = useRef(null);
  const audioPlayerRef = useRef(null);

  // Function to handle file selection
  const handleFileUpload = (file) => {
    setAudioFile(file);
  };

  // Function to handle play/pause
  const togglePlayPause = () => audioPlayerRef.current?.togglePlayPause();
  const skipBack = () => audioPlayerRef.current?.skipBack(5); // Skip back 5 seconds
  const skipForward = () => audioPlayerRef.current?.skipForward(5); // Skip forward 5 seconds
  const goToStart = () => audioPlayerRef.current?.seekTo(0);
  const goToEnd = () => audioPlayerRef.current?.goToEnd();

  // Volume controls
  const increaseVolume = () => {
    setVolume((prev) => {
      const newVolume = Math.min(prev + 0.1, 1);
      return Math.round(newVolume * 10) / 10; // Round to one decimal place
    });
    console.log('increaseVolume', volume);
  };

  function decreaseVolume() {
    setVolume((prevVolume) => {
      // Decrease volume but ensure it never goes below 0
      const newVolume = Math.max(prevVolume - 0.1, 0);
      return Math.round(newVolume * 10) / 10; // Round to one decimal place
    });
    console.log('decreaseVolume', volume);
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
      editorRef.current.findAndHighlight(findText);
    }
  };
  
  const handleReplace = () => {
    if (editorRef.current && findText && replaceText) {
      editorRef.current.replaceText(findText, replaceText);
    }
  };
  
  const handleReplaceAll = () => {
    if (editorRef.current && findText && replaceText) {
      editorRef.current.replaceAll(findText, replaceText);
    }
  };


  return (
    <div className="flex justify-center min-w-96  bg-gray-100 p-4" >
      <div className="flex flex-col max-h-full items-center w-full max-w-6xl p-4 rounded-sm">
        {/* Audio player at the top */}
        <div className="w-full">
        <AudioPlayer ref={audioPlayerRef} audioFile={audioFile} volume={volume || 1} />
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
          />
        </div>

        {/* Textarea underneath the toolbar */}
        <div className="w-full bg-white mt-4">
          <Textarea ref={editorRef} fontSize={fontSize} transcript={transcript} onTranscriptChange={handleTranscriptChange} />
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
      />
      </div>
    </div>
  );
}

export default App;
