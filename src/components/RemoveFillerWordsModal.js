import React, { useState } from 'react';
import { FaTimes } from 'react-icons/fa';

const commonFillers = [
  { word: 'uh', label: 'uh' },
  { word: 'um', label: 'um' },
  { word: 'umm', label: 'umm' },
  { word: 'like', label: 'like' },
  { word: 'you know', label: 'you know' },
  { word: 'I mean', label: 'I mean' },
  { word: 'sort of', label: 'sort of' },
  { word: 'kind of', label: 'kind of' },
  { word: 'basically', label: 'basically' },
  { word: 'literally', label: 'literally' },
  { word: 'actually', label: 'actually' },
  { word: 'right', label: 'right' },
  { word: 'okay', label: 'okay' },
  { word: 'so', label: 'so' },
  { word: 'well', label: 'well' },
  { word: 'yeah', label: 'yeah' },
  { word: 'hmm', label: 'hmm' },
  { word: 'huh', label: 'huh' },
];

const RemoveFillerWordsModal = ({ isOpen, onClose, onRemoveFillers }) => {
  const [selectedFillers, setSelectedFillers] = useState([]);

  if (!isOpen) return null;

  const handleToggleFiller = (word) => {
    setSelectedFillers(prev => 
      prev.includes(word) 
        ? prev.filter(f => f !== word)
        : [...prev, word]
    );
  };

  const handleSelectAll = () => {
    if (selectedFillers.length === commonFillers.length) {
      setSelectedFillers([]);
    } else {
      setSelectedFillers(commonFillers.map(f => f.word));
    }
  };

  const handleRemove = () => {
    if (selectedFillers.length > 0) {
      onRemoveFillers(selectedFillers);
      setSelectedFillers([]);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-[500px] max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Remove Filler Words</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Instructions */}
        <p className="text-sm text-gray-600 mb-4">
          Select the filler words you want to remove from the transcript:
        </p>

        {/* Select All / Deselect All */}
        <div className="mb-4">
          <button
            onClick={handleSelectAll}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            {selectedFillers.length === commonFillers.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        {/* Filler words grid */}
        <div className="grid grid-cols-2 gap-3 mb-6 max-h-[400px] overflow-y-auto">
          {commonFillers.map(({ word, label }) => (
            <label
              key={word}
              className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedFillers.includes(word)}
                onChange={() => handleToggleFiller(word)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleRemove}
            disabled={selectedFillers.length === 0}
            className={`px-4 py-2 text-sm text-white rounded ${
              selectedFillers.length > 0
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            Remove Selected ({selectedFillers.length})
          </button>
        </div>
      </div>
    </div>
  );
};

export default RemoveFillerWordsModal;
