// FormattingToolbar.js
import React from 'react';
import { TbLayoutSidebarRight, TbLayoutBottombar } from 'react-icons/tb';
import { HiOutlineArrowUp } from 'react-icons/hi';
import { IoClose, IoAdd } from 'react-icons/io5';
import { FiRotateCcw, FiRotateCw } from 'react-icons/fi';

const FormattingToolbar = ({
  position = 'side',
  onTogglePosition,
  onDoubleSpaceSentences,
  onDoubleSpaceSpeakerColon,
  onEllipsisToDash,
  onBlanksToIndiscernible,
  onRemoveEmptyLines,
  onUndo,
  onRedo,
  speakerMappings,
  setSpeakerMappings,
  onApplySpeakerNames,
  onExport,
}) => {

  const addMapping = () => {
    setSpeakerMappings(prev => [
      ...prev,
      { label: `S${prev.length + 1}`, name: '' },
    ]);
  };

  const updateName = (index, value) => {
    setSpeakerMappings(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], name: value };
      return updated;
    });
  };

  const moveUp = (index) => {
    if (index === 0) return;
    setSpeakerMappings(prev => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  };

  const removeMapping = (index) => {
    setSpeakerMappings(prev =>
      prev.filter((_, i) => i !== index).map((m, i) => ({ ...m, label: `S${i + 1}` }))
    );
  };

  // -- Shared sub-components ----------------------------------------------

  const SpeakerRows = () => (
    <div className="flex flex-col gap-4">
      {speakerMappings.map((m, i) => {
        const isFirst = i === 0;
        const isLast = i === speakerMappings.length - 1;
        return (
          <div key={i} className="flex items-center gap-3">
            <span className="w-9 text-sm font-semibold text-gray-500 flex-shrink-0 text-right">
              {m.label}:
            </span>
            <input
              type="text"
              value={m.name}
              onChange={e => updateName(i, e.target.value)}
              placeholder={`Speaker ${i + 1}`}
              className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 text-gray-800 placeholder-gray-400 transition-all"
            />
            <div className="flex items-center gap-2 flex-shrink-0">
              {!isFirst && (
                <button
                  onClick={() => moveUp(i)}
                  className="text-violet-500 hover:text-violet-700 transition-colors"
                  title="Move up"
                >
                  <HiOutlineArrowUp size={15} />
                </button>
              )}
              {speakerMappings.length > 1 && (
                <button
                  onClick={() => removeMapping(i)}
                  className="text-red-400 hover:text-red-600 transition-colors"
                  title="Remove"
                >
                  <IoClose size={16} />
                </button>
              )}
              {isLast && (
                <button
                  onClick={addMapping}
                  className="text-violet-500 hover:text-violet-700 transition-colors"
                  title="Add speaker"
                >
                  <IoAdd size={18} />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const FormatButtons = ({ column = false }) => (
    <div className={column ? 'flex flex-col gap-2' : 'flex flex-wrap gap-2 items-center'}>
      <div className="flex items-center gap-1">
        <button
          onClick={onUndo}
          title="Undo (Ctrl+Z)"
          className="p-1.5 text-gray-600 hover:text-violet-700 hover:bg-violet-50 border border-gray-200 hover:border-violet-300 rounded-lg transition-all"
        >
          <FiRotateCcw size={15} />
        </button>
        <button
          onClick={onRedo}
          title="Redo (Ctrl+Y)"
          className="p-1.5 text-gray-600 hover:text-violet-700 hover:bg-violet-50 border border-gray-200 hover:border-violet-300 rounded-lg transition-all"
        >
          <FiRotateCw size={15} />
        </button>
      </div>
      <div className="w-px h-4 bg-gray-200 flex-shrink-0 hidden sm:block" />
      <button
        onClick={onDoubleSpaceSentences}
        title="Add double space after . ? ! — skips abbreviations (Mr., Ms., Dr.) and decimals"
        className="px-3 py-1.5 text-xs font-medium bg-white hover:bg-violet-50 border border-gray-200 hover:border-violet-300 text-gray-700 hover:text-violet-700 rounded-lg transition-all whitespace-nowrap"
      >
        2&times; Sentence Space
      </button>
      <button
        onClick={onDoubleSpaceSpeakerColon}
        title='Ensure double space after speaker colon — e.g. "MR. IBRAHIM:  Yes."'
        className="px-3 py-1.5 text-xs font-medium bg-white hover:bg-violet-50 border border-gray-200 hover:border-violet-300 text-gray-700 hover:text-violet-700 rounded-lg transition-all whitespace-nowrap"
      >
        2&times; Speaker Colon
      </button>
      <button
        onClick={onEllipsisToDash}
        title='Replace "..." with " -- " between words'
        className="px-3 py-1.5 text-xs font-medium bg-white hover:bg-violet-50 border border-gray-200 hover:border-violet-300 text-gray-700 hover:text-violet-700 rounded-lg transition-all whitespace-nowrap font-mono tracking-tight"
      >
        ... &rarr; --
      </button>
      <button
        onClick={onBlanksToIndiscernible}
        title='Convert blank timestamps "[0:00:00.0] ____" to (indiscernible) / (Indiscernible)'
        className="px-3 py-1.5 text-xs font-medium bg-white hover:bg-violet-50 border border-gray-200 hover:border-violet-300 text-gray-700 hover:text-violet-700 rounded-lg transition-all whitespace-nowrap"
      >
        Blanks &rarr; (indiscernible)
      </button>
      <button
        onClick={onRemoveEmptyLines}
        title="Remove empty lines between paragraphs"
        className="px-3 py-1.5 text-xs font-medium bg-white hover:bg-violet-50 border border-gray-200 hover:border-violet-300 text-gray-700 hover:text-violet-700 rounded-lg transition-all whitespace-nowrap"
      >
        Remove Empty Lines
      </button>
      <button
        onClick={onExport}
        title="Export transcript with speaker names and without timestamps"
        className="px-3 py-1.5 text-xs font-medium bg-violet-600 hover:bg-violet-700 border border-violet-600 text-white rounded-lg transition-all whitespace-nowrap"
      >
        Export
      </button>
    </div>
  );

  // -- Side panel ---------------------------------------------------------

  if (position === 'side') {
    return (
      <div className="flex flex-col bg-white border-l border-gray-200 shadow-lg h-full w-80 flex-shrink-0 overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800 tracking-tight">Speaker Names</h2>
          <button
            onClick={onTogglePosition}
            className="text-gray-400 hover:text-violet-600 transition-colors p-1"
            title="Move below toolbar"
          >
            <TbLayoutBottombar size={17} />
          </button>
        </div>

        <div className="px-5 pt-5 pb-5">
          <SpeakerRows />
        </div>

        <div className="px-5 pb-5 mt-auto flex flex-col gap-2">
          <button
            onClick={onExport}
            title="Export transcript with speaker names and without timestamps"
            className="w-full py-2.5 bg-white hover:bg-violet-50 border border-violet-300 text-violet-700 text-sm font-semibold rounded-full shadow-sm transition-colors"
          >
            Export
          </button>
          <button
            onClick={onApplySpeakerNames}
            className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white text-sm font-semibold rounded-full shadow-sm transition-colors"
          >
            Update Speaker Names
          </button>
        </div>
      </div>
    );
  }

  // -- Below-toolbar layout ----------------------------------------------

  return (
    <div className="w-full bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-100 bg-gray-50">
        <button
          onClick={onTogglePosition}
          className="text-gray-400 hover:text-violet-600 transition-colors flex-shrink-0"
          title="Move to side panel"
        >
          <TbLayoutSidebarRight size={17} />
        </button>
        <div className="w-px h-4 bg-gray-200 flex-shrink-0" />
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest flex-shrink-0">
          Format
        </span>
        <FormatButtons />
      </div>
    </div>
  );
};

export default FormattingToolbar;

