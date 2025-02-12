import React, { useState } from "react";

const SwapSpeakerModal = ({ onClose, handleReplaceClick, handleSwapClick, fromLabel, toLabel, setFromLabel, setToLabel }) => {

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-lg font-semibold mb-4">Swap Speaker Labels</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium">Speaker 1</label>
          <input
            type="text"
            value={fromLabel}
            onChange={(e) => setFromLabel(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium">Speaker 2</label>
          <input
            type="text"
            value={toLabel}
            onChange={(e) => setToLabel(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={handleReplaceClick}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Replace
          </button>
          <button
            onClick={handleSwapClick}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Swap
          </button>
        </div>
      </div>
    </div>
  );
};

export default SwapSpeakerModal;
