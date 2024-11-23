// Toolbar.js
import React, { useRef } from 'react';
import { FiDownload, FiMoreHorizontal, FiZoomIn, FiZoomOut } from 'react-icons/fi';
import { TbPlayerSkipBack, TbPlayerSkipForward, TbPlayerTrackNext, TbPlayerTrackPrev, TbVolume, TbVolume2 } from "react-icons/tb";
import { FiSave } from "react-icons/fi";
import { PiPlayPauseBold } from "react-icons/pi";
import { RiFindReplaceLine, RiFileUploadLine } from "react-icons/ri";
import { MdMoreTime } from "react-icons/md";

const Toolbar = ({ 
  onFileUpload,
  togglePlayPause,
  increaseVolume,
  decreaseVolume,
  volume,
  skipBack,
  skipForward,
  goToStart,
  goToEnd,
  increaseFontSize,
  decreaseFontSize,
  transcript,
  currentTime,
  onGetTimestamp,
  onInsertTimestamp,
  toggleFindReplace
}) => {
  const fileInputRef = useRef(null);

  // Handle file selection
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      onFileUpload(file); // Pass the selected file to App.js
    }
  };

  // Open file input dialog when upload icon is clicked
  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const downloadTranscript = () => {
    const element = document.createElement('a');
    const file = new Blob([transcript], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'transcript.txt';
    document.body.appendChild(element); // Append to body to ensure it's clickable
    element.click(); // Trigger the download
    document.body.removeChild(element); // Clean up
  };

  

  const handleTimestamp = () => {
    const timestamp = onGetTimestamp(); // This comes from `App.js` via props
    onInsertTimestamp(timestamp); // Pass timestamp to `Textarea` handler
  };

  //format the time
  function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const timeString = h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `0:${m}:${s.toString().padStart(2, '0')}`;
    return timeString;
  }
  

  return (
    <div className="flex items-center space-x-6 p-1 bg-white rounded-lg shadow-md border">
      {/* Play/pause icon */}
      <button onClick={togglePlayPause} className="text-gray-600 p-1 hover:text-blue-500" title="Play/Pause (Shift + Tab)">
        <PiPlayPauseBold size={21} />
      </button>
      
      {/* Go to start of audio icon */}
      <button onClick={goToStart} className="text-gray-600 p-1 hover:text-blue-500 border-b-2 border-yellow-500" title="Go to start of audio">
        <TbPlayerSkipBack size={21} />
      </button>
      
      {/* Skipback icon */}
      <button onClick={skipBack} className="text-gray-600 p-1 hover:text-blue-500" title="Skipback 5s (Shift + Arrow Left)">
        <TbPlayerTrackPrev size={21} />
      </button>
      
      {/* Skipforward icon */}
      <button onClick={skipForward} className="text-gray-600 p-1 hover:text-blue-500" title="Skipforward 5s (Shift + Arrow Right)">
        <TbPlayerTrackNext size={21} />
      </button>
      
      {/* Go to end of audio icon */}
      <button onClick={goToEnd} className="text-gray-600 p-1 hover:text-blue-500" title="Go to end of audio icon">
        <TbPlayerSkipForward size={21} />
      </button>

      {/* Volume down icon */}
      <button onClick={decreaseVolume} disabled={volume === 0} className="text-gray-600 p-1 hover:text-blue-500" title="Volume down">
        <TbVolume2 size={21} />
      </button>
      {/* Volume up icon */}
      <button onClick={increaseVolume} disabled={volume === 1} className="text-gray-600 p-1 hover:text-blue-500" title="Volume up">
        <TbVolume size={21} />
      </button>

      {/* Display current time*/}
      <span className="bg-white p-1 text-gray-600 rounded-sm border ">Time: {formatTime(currentTime)}</span>

      {/* Add timestamp icon */}
      <button onClick={handleTimestamp} className="text-gray-600 p-1 hover:text-blue-500" title="Add timestamp (Ctrl + Shift)">
        <MdMoreTime size={21} />
      </button>


      {/* Increase font icon */}
      <button onClick={increaseFontSize} className="text-gray-600 p-1 hover:text-blue-500" title="Increase font">
        <FiZoomIn size={21} />
      </button>

      {/* Decrease font icon */}
      <button onClick={decreaseFontSize} className="text-gray-600 p-1 hover:text-blue-500" title="Decrease font">
        <FiZoomOut size={21} />
      </button>
      
      {/* Save icon */}
      <button className="text-gray-600 p-1  hover:text-blue-500" title="Save">
        <FiSave size={21} />
      </button>
      
      {/* Search icon */}
      <button onClick={toggleFindReplace} className="text-gray-600 p-1 hover:text-blue-500" title="Find & Replace">
        <RiFindReplaceLine size={21} />
      </button>

      {/* Download icon */}
      <button onClick={downloadTranscript} className="text-gray-600 p-1 hover:text-blue-500" title="Download">
        <FiDownload size={21} />
      </button>

      {/* Upload icon (triggers file input) */}
      <button onClick={handleUploadClick} className="text-gray-600 p-1 hover:text-blue-500" title="Upload an audio file">
        <RiFileUploadLine size={21} />
      </button>
      
      {/* Hidden file input for audio upload */}
      <input
        type="file"
        accept="audio/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      
      {/* More options icon */}
      <button className="text-gray-600 p-1 hover:text-blue-500" title="More Options">
        <FiMoreHorizontal size={21} />
      </button>
    </div>
  );
};

export default Toolbar;
