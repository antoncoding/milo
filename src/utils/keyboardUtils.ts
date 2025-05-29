export type Shortcut = string[];

// Normalize key codes to consistent format
export function normalizeKey(code: string): string {
  // Handle modifiers
  switch (code) {
    case 'MetaLeft':
    case 'MetaRight':
      return 'Meta';
    case 'ControlLeft':
    case 'ControlRight':
      return 'Control';
    case 'AltLeft':
    case 'AltRight':
      return 'Alt';
    case 'ShiftLeft':
    case 'ShiftRight':
      return 'Shift';
    default:
      return code;
  }
}

// Check if a key is a modifier
export function isModifierKey(key: string): boolean {
  return ['Meta', 'Control', 'Alt', 'Shift'].includes(key);
}

// Format key for display
export function formatKey(key: string): string {
  switch (key) {
    case 'Meta':
      return '⌘';
    case 'Control':
      return 'Ctrl';
    case 'Alt':
      return '⌥';
    case 'Shift':
      return '⇧';
    case 'Space':
      return 'Space';
    default:
      // Remove 'Key' prefix and return the letter
      if (key.startsWith('Key')) {
        return key.substring(3);
      }
      // Remove 'Digit' prefix for numbers
      if (key.startsWith('Digit')) {
        return key.substring(5);
      }
      return key;
  }
}

// Sort keys to ensure consistent order (modifiers first)
export function sortKeys(keys: string[]): string[] {
  const modifierOrder = ['Meta', 'Control', 'Alt', 'Shift'];
  const modifiers = keys.filter(isModifierKey);
  const nonModifiers = keys.filter(key => !isModifierKey(key));
  
  // Sort modifiers according to predefined order
  const sortedModifiers = modifierOrder.filter(mod => modifiers.includes(mod));
  
  return [...sortedModifiers, ...nonModifiers];
}

// Convert display format back to internal format
export function formatKeyForBackend(key: string): string {
  switch (key) {
    case '⌘':
    case 'Meta':
      return 'meta';
    case 'Ctrl':
    case 'Control':
      return 'ctrl';
    case '⌥':
    case 'Alt':
      return 'alt';
    case '⇧':
    case 'Shift':
      return 'shift';
    case 'Space':
      return 'space';
    default:
      // Convert single letters to KeyX format
      if (key.length === 1 && /[a-zA-Z]/.test(key)) {
        return `Key${key.toUpperCase()}`;
      }
      // Convert numbers to DigitX format
      if (key.length === 1 && /[0-9]/.test(key)) {
        return `Digit${key}`;
      }
      return key.toLowerCase();
  }
}

// Convert shortcut array to backend format
export function shortcutToBackendFormat(shortcut: Shortcut): string {
  return shortcut.map(formatKeyForBackend).join('+');
}

// Convert backend format to shortcut array
export function backendFormatToShortcut(backendFormat: string): Shortcut {
  return backendFormat.split('+').map(part => {
    switch (part.toLowerCase()) {
      case 'meta':
        return 'Meta';
      case 'ctrl':
      case 'control':
        return 'Control';
      case 'alt':
        return 'Alt';
      case 'shift':
        return 'Shift';
      default:
        if (part.toLowerCase().startsWith('key')) {
          return part.charAt(3).toUpperCase();
        }
        if (part.toLowerCase().startsWith('digit')) {
          return part.charAt(5);
        }
        return part;
    }
  });
} 