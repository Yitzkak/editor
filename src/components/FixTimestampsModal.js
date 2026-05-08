import React, { useState } from 'react';
import { FaTimes, FaWrench } from 'react-icons/fa';

const FixTimestampsModal = ({ isOpen, onClose, onFix }) => {
  const [hourNumber, setHourNumber] = useState('');

  if (!isOpen) return null;

  const handleFix = () => {
    const value = parseInt(hourNumber, 10);
    if (!isNaN(value) && value >= 0) {
      onFix(value);
      setHourNumber('');
      onClose();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleFix();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const isValid = !isNaN(parseInt(hourNumber, 10)) && parseInt(hourNumber, 10) >= 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-[420px]">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Fix Timestamps</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Instructions */}
        <p className="text-sm text-gray-600 mb-2">
          Timestamps like <code className="bg-gray-100 px-1 rounded">00:01.5 S1:</code> or{' '}
          <code className="bg-gray-100 px-1 rounded">07:34 S1:</code> are missing the leading
          hour number. Enter the hour number to prepend (e.g. <strong>0</strong> for the
          first hour).
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Timestamps missing a decimal will also receive a random digit (0–9). Different
          paragraphs get different random digits.
        </p>

        {/* Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Leading hour number
          </label>
          <input
            type="number"
            min="0"
            step="1"
            value={hourNumber}
            onChange={(e) => setHourNumber(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. 0, 1, 2 …"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            autoFocus
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleFix}
            disabled={!isValid}
            className={`flex items-center space-x-2 px-4 py-2 text-sm rounded ${
              isValid
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <FaWrench size={12} />
            <span>Fix Timestamps</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FixTimestampsModal;
