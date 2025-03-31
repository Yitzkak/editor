import React from 'react';

const KeyboardShortcutsModal = ({isOpen, onClose}) => {
    if (!isOpen) return null;

    const shortcuts = [
        { keys: "Shift + Tab", action: "Toggle play/pause" },
        { keys: "Shift + backward arrow", action: "Skip backward by 5 seconds" },
        { keys: "Shift + forward arrow", action: "Skip forward by 5 seconds" },
        { keys: "Alt + S", action: "Format highlighted text with dashes (e.g., John -> J-O-H-N)" },
        { keys: "Ctrl + U", action: "Convert highlighted text to uppercase (e.g., man -> MAN)" },
        { keys: "Ctrl + G", action: "Capitalize the first letter of each highlighted word (e.g., we are here -> We Are Here)" },
        
      ];

    return(
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white w-1/2 p-4 rounded shadow-lg">
                <table className="w-full border-collapse border border-gray-300">
                    <thead>
                    <tr className="bg-blue-100">
                        <th className="border border-gray-300 px-4 py-2 text-left">Shortcut</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Action</th>
                    </tr>
                    </thead>
                    <tbody>
                    {shortcuts.map((shortcut, index) => (
                        <tr key={index} className="hover:bg-gray-100">
                        <td className="border border-gray-300 px-4 py-2 font-mono">{shortcut.keys}</td>
                        <td className="border border-gray-300 px-4 py-2">{shortcut.action}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                
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

export default KeyboardShortcutsModal;
