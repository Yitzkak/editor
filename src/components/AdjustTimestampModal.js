import React, { useState } from 'react';
import { FaTimes, FaPlus, FaMinus } from 'react-icons/fa';

const AdjustTimestampModal = ({ isOpen, onClose, onAdjust }) => {
  const [seconds, setSeconds] = useState('');

  if (!isOpen) return null;

  const handleAdd = () => {
    const value = parseFloat(seconds);
    if (!isNaN(value) && value !== 0) {
      onAdjust(Math.abs(value));
      setSeconds('');
      onClose();
    }
  };

  const handleSubtract = () => {
    const value = parseFloat(seconds);
    if (!isNaN(value) && value !== 0) {
      onAdjust(-Math.abs(value));
      setSeconds('');
      onClose();
    }
  };

  const handleKeyPress = (e, action) => {
    if (e.key === 'Enter') {
      if (action === 'add') {
        handleAdd();
      } else if (action === 'subtract') {
        handleSubtract();
      }
    }
  };

  const isValid = !isNaN(parseFloat(seconds)) && parseFloat(seconds) !== 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-[400px]">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Adjust Timestamps</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Instructions */}
        <p className="text-sm text-gray-600 mb-4">
          Enter the number of seconds to add or subtract from all highlighted timestamps:
        </p>

        {/* Input field */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Seconds
          </label>
          <input
            type="number"
            step="0.1"
            value={seconds}
            onChange={(e) => setSeconds(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, 'add')}
            placeholder="e.g., 5 or 2.5"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            autoFocus
          />
        </div>

        {/* Action buttons */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={handleSubtract}
            disabled={!isValid}
            className={`flex items-center space-x-2 px-4 py-2 text-sm rounded ${
              isValid
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <FaMinus size={12} />
            <span>Subtract</span>
          </button>
          <button
            onClick={handleAdd}
            disabled={!isValid}
            className={`flex items-center space-x-2 px-4 py-2 text-sm rounded ${
              isValid
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <FaPlus size={12} />
            <span>Add</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdjustTimestampModal;
