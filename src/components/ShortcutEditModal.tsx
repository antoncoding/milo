import React from 'react';
import { formatKey, sortKeys } from '../utils/keyboardUtils';

interface ShortcutEditModalProps {
  isOpen: boolean;
  currentKeys: string[];
  onSave: () => void;
  onCancel: () => void;
}

export function ShortcutEditModal({
  isOpen,
  currentKeys,
  onSave,
  onCancel,
}: ShortcutEditModalProps) {
  if (!isOpen) return null;

  const renderKeys = (keys: string[]) => {
    const sortedKeys = sortKeys(keys);
    return sortedKeys.map((key, index) => (
      <kbd
        key={index}
        className="px-3 py-2 text-lg font-semibold rounded-lg shadow-md bg-white border-2 border-gray-300 text-gray-900 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
      >
        {formatKey(key)}
      </kbd>
    ));
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  const canSave = currentKeys.length >= 2;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 transform transition-all">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Set New Shortcut
          </h2>
          
          <div className="mb-8">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Press your desired key combination
            </p>
            
            <div className="min-h-[60px] flex items-center justify-center gap-2 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
              {currentKeys.length > 0 ? (
                renderKeys(currentKeys)
              ) : (
                <span className="text-gray-500 dark:text-gray-400 italic">
                  Waiting for keys...
                </span>
              )}
            </div>
            
            {currentKeys.length > 0 && currentKeys.length < 2 && (
              <p className="text-sm text-orange-600 dark:text-orange-400 mt-2">
                Add at least one modifier key (Cmd, Ctrl, Alt, Shift)
              </p>
            )}
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={onCancel}
              className="px-6 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={!canSave}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              Save Shortcut
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 