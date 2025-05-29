import React from 'react';
import { formatKey, sortKeys } from "../utils/keyboardUtils";
import { ShortcutEditModal } from './ShortcutEditModal';

interface ShortcutItemProps {
  shortcut: string[];
  isEnabled: boolean;
  isModalOpen: boolean;
  currentKeys: string[];
  onToggleEnabled: () => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}

export function ShortcutItem({
  shortcut,
  isEnabled,
  isModalOpen,
  currentKeys,
  onToggleEnabled,
  onEdit,
  onSave,
  onCancel,
}: ShortcutItemProps) {
  const renderKeys = (keys: string[]) => {
    const sortedKeys = sortKeys(keys);
    return sortedKeys.map((key, index) => (
      <React.Fragment key={index}>
        <kbd
          className={`
            px-2 py-1 text-xs font-medium rounded border
            ${isEnabled 
              ? 'bg-white border-gray-300 text-gray-800 shadow-sm' 
              : 'bg-gray-100 border-gray-200 text-gray-400'
            }
          `}
        >
          {formatKey(key)}
        </kbd>
        {index < sortedKeys.length - 1 && (
          <span className={`mx-1 text-xs ${isEnabled ? 'text-gray-500' : 'text-gray-300'}`}>
            +
          </span>
        )}
      </React.Fragment>
    ));
  };

  return (
    <>
      <div className="space-y-2">
        {/* Enable Toggle - First Line */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Enable Shortcut
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={onToggleEnabled}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Shortcut Display - Second Line */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {renderKeys(shortcut)}
          </div>
          <button
            onClick={onEdit}
            disabled={!isEnabled}
            className={`
              px-2 py-1 text-xs font-medium rounded transition-colors
              ${isEnabled 
                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600' 
                : 'bg-gray-50 text-gray-300 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600'
              }
            `}
          >
            Edit
          </button>
        </div>
      </div>

      {/* Edit Modal */}
      <ShortcutEditModal
        isOpen={isModalOpen}
        currentKeys={currentKeys}
        onSave={onSave}
        onCancel={onCancel}
      />
    </>
  );
} 