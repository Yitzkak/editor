import React, { useState } from 'react';
import { FiX, FiClock, FiRotateCcw, FiTrash2 } from 'react-icons/fi';

const VersionHistoryModal = ({ isOpen, onClose, versions, onRestore, onDelete }) => {
  const [selectedVersion, setSelectedVersion] = useState(null);

  if (!isOpen) return null;

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getPreview = (content) => {
    const lines = content.split('\n').filter(line => line.trim());
    const preview = lines.slice(0, 3).join(' ').substring(0, 100);
    return preview + (content.length > 100 ? '...' : '');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Version History</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Version List */}
          <div className="w-1/3 border-r overflow-y-auto">
            {versions.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <FiClock size={48} className="mx-auto mb-2 opacity-50" />
                <p>No versions saved yet</p>
              </div>
            ) : (
              <div className="divide-y">
                {versions.map((version, index) => (
                  <div
                    key={version.id}
                    onClick={() => setSelectedVersion(version)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedVersion?.id === version.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-700">
                        Version {versions.length - index}
                      </span>
                      <FiClock size={14} className="text-gray-400" />
                    </div>
                    <p className="text-xs text-gray-500 mb-2">
                      {formatDate(version.timestamp)}
                    </p>
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {getPreview(version.content)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Preview Panel */}
          <div className="flex-1 flex flex-col">
            {selectedVersion ? (
              <>
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      Version {versions.findIndex(v => v.id === selectedVersion.id) + 1}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Saved {formatDate(selectedVersion.timestamp)}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 whitespace-pre-wrap font-mono text-sm text-gray-700 max-h-96 overflow-y-auto">
                    {selectedVersion.content}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="border-t p-4 flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this version?')) {
                        onDelete(selectedVersion.id);
                        setSelectedVersion(null);
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <FiTrash2 size={16} />
                    Delete Version
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Restore this version? Current content will be saved as a new version.')) {
                        onRestore(selectedVersion.id);
                        onClose();
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <FiRotateCcw size={16} />
                    Restore Version
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                Select a version to preview
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VersionHistoryModal;
