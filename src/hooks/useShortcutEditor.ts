import { useState, useCallback, useEffect } from 'react';
import { Shortcut, normalizeKey, isModifierKey, sortKeys } from '../utils/keyboardUtils';

const RESERVED_SHORTCUTS = [
  ["Meta", "C"],
  ["Meta", "V"],
  ["Meta", "X"],
  ["Meta", "A"],
  ["Meta", "Z"],
  ["Meta", "Q"],
  // Windows/Linux
  ["Control", "C"],
  ["Control", "V"],
  ["Control", "X"],
  ["Control", "A"],
  ["Control", "Z"],
  // Common browser shortcuts
  ["Meta", "T"],
  ["Meta", "N"],
  ["Meta", "W"],
  ["Meta", "R"],
  ["Control", "T"],
  ["Control", "N"],
  ["Control", "W"],
  ["Control", "R"],
];

export interface ShortcutEditorState {
  isEnabled: boolean;
  isModalOpen: boolean;
  currentKeys: string[];
}

export function useShortcutEditor(
  initialEnabled: boolean = true,
  onChange: (shortcut: Shortcut) => void,
  onEnabledChange: (enabled: boolean) => void
) {
  const [isEnabled, setIsEnabled] = useState(initialEnabled);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentKeys, setCurrentKeys] = useState<string[]>([]);

  const toggleEnabled = useCallback(() => {
    const newEnabled = !isEnabled;
    setIsEnabled(newEnabled);
    onEnabledChange(newEnabled);
  }, [isEnabled, onEnabledChange]);

  const openEditModal = useCallback(() => {
    setIsModalOpen(true);
    setCurrentKeys([]);
  }, []);

  const closeEditModal = useCallback(() => {
    setIsModalOpen(false);
    setCurrentKeys([]);
  }, []);

  const saveShortcut = useCallback(async () => {
    console.log("🔄 Hook: Attempting to save shortcut");
    console.log("   Current keys:", currentKeys);
    
    if (currentKeys.length < 2) {
      console.log("❌ Hook: Cannot save - insufficient keys");
      return;
    }

    const hasModifier = currentKeys.some(isModifierKey);
    const hasNonModifier = currentKeys.some(key => !isModifierKey(key));
    
    if (!hasModifier || !hasNonModifier) {
      console.log("❌ Hook: Invalid key combination - needs modifier + key");
      return;
    }

    // Check for reserved shortcuts
    const isReserved = RESERVED_SHORTCUTS.some(reserved =>
      reserved.length === currentKeys.length &&
      reserved.every((key, index) => key.toLowerCase() === currentKeys[index].toLowerCase())
    );

    if (isReserved) {
      console.error("❌ Hook: This is a system reserved shortcut");
      return;
    }

    // Sort keys to ensure consistent order (modifiers first)
    const sortedKeys = sortKeys(currentKeys);
    console.log("✅ Hook: Saving sorted keys:", sortedKeys);

    onChange(sortedKeys);
    closeEditModal();
  }, [currentKeys, onChange, closeEditModal]);

  // Handle keydown events only when modal is open
  useEffect(() => {
    if (!isModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const key = normalizeKey(e.code);
      console.log("⌨️  Hook: Key pressed:", e.code, "→", key);
      
      setCurrentKeys(prev => {
        const newPressed = new Set([...prev, key]);
        
        // Update current keys based on pressed keys
        const keys = Array.from(newPressed);
        let modifiers = keys.filter(isModifierKey);
        let nonModifiers = keys.filter(k => !isModifierKey(k));

        // Limit to 2 modifiers and 1 non-modifier
        if (modifiers.length > 2) {
          modifiers = modifiers.slice(0, 2);
        }
        if (nonModifiers.length > 1) {
          nonModifiers = nonModifiers.slice(0, 1);
        }

        const result = [...modifiers, ...nonModifiers];
        console.log("⌨️  Hook: Updated current keys:", result);
        return result;
      });
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen]);

  // Clean up state when component unmounts
  useEffect(() => {
    return () => {
      if (isModalOpen) {
        closeEditModal();
      }
    };
  }, [isModalOpen, closeEditModal]);

  return {
    isEnabled,
    isModalOpen,
    currentKeys,
    toggleEnabled,
    openEditModal,
    closeEditModal,
    saveShortcut
  };
} 