import React, { useRef, useState, useEffect } from 'react';

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
  caseSensitive,
  setCaseSensitive,
  wholeWord,
  setWholeWord,
}) => {
  const modalRef = useRef(null);
  const headerRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!isOpen) return;
    // center modal initially
    setPosition({ x: 0, y: 0 });
  }, [isOpen]);

  const onMouseDown = (e) => {
    if (!headerRef.current || !modalRef.current) return;
    const rect = modalRef.current.getBoundingClientRect();
    setOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setDragging(true);
    e.preventDefault();
  };

  const onMouseMove = (e) => {
    if (!dragging) return;
    const newX = e.clientX - offset.x;
    const newY = e.clientY - offset.y;
    // constrain within viewport
    const maxX = window.innerWidth - (modalRef.current?.offsetWidth || 0);
    const maxY = window.innerHeight - (modalRef.current?.offsetHeight || 0);
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    });
  };

  const onMouseUp = () => setDragging(false);

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [isOpen, dragging, offset]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 pointer-events-none">
      <div
        ref={modalRef}
        className="fixed bg-white w-96 p-4 rounded shadow-lg pointer-events-auto z-50"
        style={{ left: position.x, top: position.y }}
      >
        <div
          ref={headerRef}
          className="cursor-move -mx-4 -mt-4 px-4 pt-3 pb-2 rounded-t bg-gray-100 border-b"
          onMouseDown={onMouseDown}
        >
          <h2 className="text-sm font-semibold text-gray-700">Find and Replace</h2>
        </div>
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
        <div className="mb-4 flex items-center">
          <input
            id="caseSensitiveCheckbox"
            type="checkbox"
            checked={caseSensitive}
            onChange={e => setCaseSensitive(e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="caseSensitiveCheckbox" className="text-sm">Case sensitive</label>
        </div>
        <div className="mb-4 flex items-center">
          <input
            id="wholeWordCheckbox"
            type="checkbox"
            checked={wholeWord}
            onChange={e => setWholeWord(e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="wholeWordCheckbox" className="text-sm">Whole word</label>
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
