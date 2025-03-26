import React, {useState, useEffect } from 'react';

const AmplifyVolumeModal = ({ isOpen, onClose, onIncrease, onDecrease }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-80 text-center">
        <h2 className="text-xl font-semibold mb-4">Amplify Audio</h2>
        <div className="flex justify-center gap-4 mb-4">
          <button
            onClick={onDecrease}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
          >
            -
          </button>
          <button
            onClick={onIncrease}
            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
          >
            +
          </button>
        </div>
        <button
          onClick={onClose}
          className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default AmplifyVolumeModal;