// Toolbar.js
import React, { useRef, useState, useEffect } from 'react';
import SwapSpeakerModal from "./SwapSpeakerModal";
import AmplifyVolumeModal from './AmplifyVolumeModal';
import KeyboardShortcutsModal from './KeyboardShortcutsModal';

//Icons import
import { FiDownload, FiMoreHorizontal, FiZoomIn, FiZoomOut, FiSave } from 'react-icons/fi';
import { TbPlayerSkipBack, TbPlayerSkipForward, TbPlayerTrackNext, TbPlayerTrackPrev, TbVolume, TbVolume2 } from "react-icons/tb";
import { PiPlayPauseBold } from "react-icons/pi";
import { RiFindReplaceLine, RiFileUploadLine } from "react-icons/ri";
import { MdMoreTime } from "react-icons/md";
import { FaExchangeAlt, FaRegKeyboard  } from "react-icons/fa";


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
  onAmplifyClick,
  handleAmplificationChange,
  amplification,
  onIncrease, 
  onDecrease,
  downloadTranscript,
  speed, 
  onSpeedChange,
  onReplaceSpeakerLabel, 
  onSwapSpeakerLabels,
  handlePreventBlur,
  // New props for modal management
  showSwapModal,
  setShowSwapModal,
  fromLabel,
  toLabel,
  setFromLabel,
  setToLabel,
  handleSwapClick,
  handleReplaceClick,
  handleAmplifyIncrease,
  handleAmplifyDecrease,
  // Add onFixCapitalization to props
  onFixCapitalization,
  autosuggestionEnabled,
  setAutosuggestionEnabled,
  onFixTranscript,
}) => {
  const fileInputRef = useRef(null);
  const [speedInput, setSpeedInput] = useState(`${speed}%`);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isAmplifyOpen, setIsAmplifyOpen] = useState(false);
  const [showKeyboardShortcutsModal, setShowKeyboardShortcutsModal] = useState(false);
  const dropdownRef = useRef(null);
  const moreButtonRef = useRef(null);

  // Click-away handler for dropdown
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClick(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        moreButtonRef.current &&
        !moreButtonRef.current.contains(event.target)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [dropdownOpen]);

  // const [fromLabel, setFromLabel] = useState('S1');
  // const [toLabel, setToLabel] = useState('S2');

  // const handleReplaceClick = () => {
  //   if (fromLabel && toLabel) {
  //     onReplaceSpeakerLabel(fromLabel, toLabel);
  //   }
  // };

  // const handleSwapClick = () => {
  //   if (fromLabel && toLabel) {
  //     onSwapSpeakerLabels(fromLabel, toLabel);
  //   }
  // };

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
  
   // Handle input change
   const handleInputChange = (e) => {
    let value = e.target.value.replace("%", ""); // Remove '%' if typed
    setSpeedInput(value + "%"); // Always show '%' while typing
  };

  // Handle speed update when Enter is pressed or focus is lost
  const handleSpeedUpdate = () => {
    let numValue = parseInt(speedInput.replace("%", ""), 10); // Get numeric value
    if (isNaN(numValue)) numValue = 100; // Default to 100% if invalid

    numValue = Math.max(50, Math.min(numValue, 200)); // Clamp between 50% and 200%
    setSpeedInput(`${numValue}%`); // Update display
    onSpeedChange(numValue / 100); // Convert to decimal (0.5 - 2.0)
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
        <span className="ml-2 text-gray-600">{amplification.toFixed(2)}x</span>
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
      <div>
        <label className=" text-gray-600 text-[14px]"> Speed:</label>
        <input
          type="text"
          value={speedInput}
          onChange={handleInputChange}
          onBlur={handleSpeedUpdate} // Apply speed when focus is lost
          onKeyDown={(e) => e.key === "Enter" && handleSpeedUpdate()} // Apply speed when Enter is pressed
          className="w-12 text-gray-600 text-[12px] ml-2 px-2 py-1 rounded-sm border "
        />
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
          <button ref={moreButtonRef} onClick={() => setDropdownOpen(!dropdownOpen)} className="text-gray-600 p-1 hover:text-blue-500" title="More Options">
            <FiMoreHorizontal size={21} />
          </button>

        {/* Dropdown menu */}
        {dropdownOpen && (
          <div ref={dropdownRef} className="absolute right-0 mt-2 w-56 bg-white border rounded-lg shadow-lg z-50 py-3">
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

            <button
              onClick={() => {
                setIsAmplifyOpen(true);
                setDropdownOpen(false);
              }}
              className="flex items-center w-full px-6 py-4 text-[12px] hover:bg-gray-100"
            >
              <TbVolume size={15} className="mr-6 text-gray-600 text-[12px] font-[400]" />
              <span>Amplify Audio</span> 
            </button>

            <button
              onClick={() => {
                setShowKeyboardShortcutsModal(true);
                setDropdownOpen(false);
              }}
              className="flex items-center w-full px-6 py-4 text-[12px] hover:bg-gray-100"
            >
              <FaRegKeyboard  size={15} className="mr-6 text-gray-600 text-[12px] font-[400]" />
              <span>Keyboard Shortcuts</span> 
            </button>
            {/* Autosuggestion toggle */}
            <div className="flex items-center w-full px-6 py-4 text-[12px] hover:bg-gray-100">
              <input
                type="checkbox"
                checked={autosuggestionEnabled}
                onChange={e => setAutosuggestionEnabled(e.target.checked)}
                className="mr-3"
                id="autosuggestion-toggle"
              />
              <label htmlFor="autosuggestion-toggle" className="cursor-pointer">
                Enable Autosuggestion
              </label>
            </div>
            <button
              onClick={() => {
                onFixCapitalization();
                setDropdownOpen(false);
              }}
              className="flex items-center w-full px-6 py-4 text-[12px] hover:bg-gray-100"
            >
              <span style={{ marginRight: 16, fontWeight: 600, fontSize: 10}}>Aa</span>
              <span>Fix Capitalization</span>
            </button>
            <button
              onClick={() => {
                onFixTranscript();
                setDropdownOpen(false);
              }}
              className="flex items-center w-full px-6 py-4 text-[12px] hover:bg-gray-100"
            >
              <span style={{ marginRight: 16, fontWeight: 600, fontSize: 10}}>&#9998;</span>
              <span>Fix Transcript</span>
            </button>
          </div>
        )}

        

        {/* Aplify Volume Modal */}
        {isAmplifyOpen && (
        <AmplifyVolumeModal
          isOpen={isAmplifyOpen}
          onClose={() => setIsAmplifyOpen(false)}
          onIncrease={handleAmplifyIncrease}
          onDecrease={handleAmplifyDecrease}
          amplification={amplification}
        />
        )}

        {/* Keyboard Shortcuts Modal*/}
        {showKeyboardShortcutsModal && (
          <KeyboardShortcutsModal
            isOpen = {showKeyboardShortcutsModal}
            onClose={() => setShowKeyboardShortcutsModal(false)}
          />
        )}
      </div>
    </div>
  );
};

export default Toolbar;
