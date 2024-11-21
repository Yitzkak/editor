import React from 'react';

const FindReplaceModal = ({
  isOpen,
  onClose,
  findText,
  replaceText,
  setFindText,
  setReplaceText,
  handleFind,
  handleReplace,
  handleReplaceAll,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center">
      <div className="bg-white w-96 p-4 rounded shadow-lg">
        <h2 className="text-xl font-bold mb-4">Find and Replace</h2>
        <div className="mb-4">
          <label className="block mb-1 text-sm font-semibold">Find:</label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded p-2"
            value={findText}
            onChange={(e) => setFindText(e.target.value)}
          />
        </div>
        <div className="mb-4">
          <label className="block mb-1 text-sm font-semibold">Replace With:</label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded p-2"
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
          />
        </div>
        <div className="flex justify-between">
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded"
            onClick={handleFind}
          >
            Find Next
          </button>
          <button
            className="bg-green-500 text-white px-4 py-2 rounded"
            onClick={handleReplace}
          >
            Replace
          </button>
          <button
            className="bg-red-500 text-white px-4 py-2 rounded"
            onClick={handleReplaceAll}
          >
            Replace All
          </button>
        </div>
        <button
          className="mt-4 bg-gray-500 text-white px-4 py-2 rounded"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default FindReplaceModal;
