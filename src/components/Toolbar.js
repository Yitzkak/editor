// Toolbar.js
import React, { useRef, useState } from 'react';
import SwapSpeakerModal from "./SwapSpeakerModal";

//Icons import
import { FiDownload, FiMoreHorizontal, FiZoomIn, FiZoomOut, FiSave } from 'react-icons/fi';
import { TbPlayerSkipBack, TbPlayerSkipForward, TbPlayerTrackNext, TbPlayerTrackPrev, TbVolume, TbVolume2 } from "react-icons/tb";
import { PiPlayPauseBold } from "react-icons/pi";
import { RiFindReplaceLine, RiFileUploadLine } from "react-icons/ri";
import { MdMoreTime, MdSpeed } from "react-icons/md";
import { FaExchangeAlt } from "react-icons/fa";

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
  currentTime,
  onGetTimestamp,
  onInsertTimestamp,
  toggleFindReplace,
  handleAmplificationChange,
  amplification,
  downloadTranscript,
  playbackSpeed,
  setPlaybackSpeed,
  onReplaceSpeakerLabel, 
  onSwapSpeakerLabels,
  handlePreventBlur
}) => {
  const fileInputRef = useRef(null);
  const [showSpeedSlider, setShowSpeedSlider] = useState(false);
  const [speed, setSpeed] = useState(playbackSpeed);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);

  const [fromLabel, setFromLabel] = useState('');
  const [toLabel, setToLabel] = useState('');

  const handleReplaceClick = () => {
    if (fromLabel && toLabel) {
      onReplaceSpeakerLabel(fromLabel, toLabel);
    }
  };

  const handleSwapClick = () => {
    if (fromLabel && toLabel) {
      onSwapSpeakerLabels(fromLabel, toLabel);
    }
  };

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
  
  // Function to handle slider change
  const handleSpeedChange = (e) => {
    const newSpeed = parseFloat(e.target.value);
    setSpeed(newSpeed);
    setPlaybackSpeed(newSpeed); // Update speed in App.js
  };

  return (
    <div className="flex items-center space-x-6 p-1 bg-white rounded-lg shadow-md border">
      {/* Play/pause icon */}
      <button onClick={togglePlayPause} className="text-gray-600 p-1 hover:text-blue-500" title="Play/Pause (Shift + Tab)">
        <PiPlayPauseBold size={21} />
      </button>
      
      {/* Go to start of audio icon */}
      <button onClick={goToStart} className="text-gray-600 p-1 hover:text-blue-500" title="Go to start of audio">
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

      {/* <div className="flex items-center">
        <input
          type="range"
          min="1"
          max="3"
          step="0.1"
          value={amplification}
          onChange={handleAmplificationChange}
          className="w-24 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
        />
        <span className="ml-2 text-gray-600">{amplification.toFixed(1)}x</span>
      </div> */}


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

      {/* Speed icon */}
      <div className="relative">
        <button
          onClick={() => setShowSpeedSlider(!showSpeedSlider)}
          className="text-gray-600 p-1 hover:text-blue-500"
          title="Speed"
        >
          <MdSpeed size={21} />
        </button>

        {/* Show the speed slider if toggled */}
        {showSpeedSlider && (
          <div
            className="absolute top-full left-1/2 -translate-x-1/2 mt-2  z-10 flex justify-center"
            style={{ width: "4px" , height: "80px" }}
          >
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={speed}
              onChange={handleSpeedChange}
              className="w-20 h-20 transform rotate-90 cursor-pointer" // Rotate slider to vertical
            />
          </div>
        )}
      </div>

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
      
      {/* Three-dot menu */}
      <div className="relative">
        {/* More options icon */}
          <button onClick={() => setDropdownOpen(!dropdownOpen)} className="text-gray-600 p-1 hover:text-blue-500" title="More Options">
            <FiMoreHorizontal size={21} />
          </button>

        {/* Dropdown menu */}
        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white border rounded-lg shadow-lg z-50">
            {/* Swap Speaker Labels Option */}
            <button
              onClick={() => {
                setShowSwapModal(true);
                setDropdownOpen(false);
              }}
              className="flex items-center w-full px-6 py-4 text-[12px] hover:bg-gray-100"
            >
              <FaExchangeAlt size={15} className="mr-6 text-gray-600 text-[12px] font-[400]" />
              <span>Swap Speaker Labels</span>
            </button>
          </div>
        )}

        {/* Swap Speaker Modal */}
        {showSwapModal && (
          <SwapSpeakerModal 
            onClose={() => setShowSwapModal(false)} 
            fromLabel={fromLabel} 
            toLabel={toLabel}
            handleSwapClick={handleSwapClick}
            handleReplaceClick={handleReplaceClick}
            setFromLabel={setFromLabel}
            setToLabel={setToLabel}
          />
            
        )}
      </div>
    </div>
  );
};

export default Toolbar;
