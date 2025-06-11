/**
 * Theme Provider for Milo App
 * 
 * This theme system provides a unified way to handle light/dark/system themes
 * across the entire application with backend persistence.
 * 
 * MIGRATION GUIDE for existing components:
 * 
 * Replace hardcoded Tailwind colors with theme-aware ones:
 * 
 * Old:                           New:
 * bg-white                   →   bg-background-secondary
 * bg-gray-50/bg-slate-100    →   bg-background-tertiary  
 * bg-gray-900/bg-slate-900   →   bg-background-primary (in dark mode)
 * text-gray-900/text-slate-900 → text-text-primary
 * text-gray-600/text-slate-600 → text-text-secondary
 * text-gray-400/text-slate-400 → text-text-tertiary
 * border-gray-200/border-slate-200 → border-border-primary
 * border-gray-300/border-slate-300 → border-border-secondary
 * text-blue-500             →   text-accent-primary
 * bg-blue-500               →   bg-accent-primary
 * 
 * USAGE:
 * 1. Wrap your app with <ThemeProvider>
 * 2. Use the useTheme() hook to access theme state
 * 3. Use the ThemeSelector component for theme switching UI
 * 4. All colors automatically adapt based on current theme
 * 
 * FEATURES:
 * - Light/Dark/System theme support
 * - Automatic system theme detection
 * - Smooth transitions between themes
 * - Persistent theme storage via Tauri backend
 * - CSS custom properties for dynamic theming
 * - Backward compatible (existing settings won't break)
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [isDark, setIsDark] = useState(false);

  // Load theme from backend on mount
  useEffect(() => {
    loadTheme();
  }, []);

  // Update DOM and dark mode state when theme changes
  useEffect(() => {
    updateTheme(theme);
  }, [theme]);

  const loadTheme = async () => {
    try {
      const settings = await invoke<any>('get_settings');
      const savedTheme = settings.theme || 'light';
      setThemeState(savedTheme as Theme);
    } catch (error) {
      console.error('Failed to load theme:', error);
      setThemeState('light');
    }
  };

  const updateTheme = (newTheme: Theme) => {
    const root = document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark');
    
    // Determine if we should use dark mode
    let useDark = false;
    
    if (newTheme === 'dark') {
      useDark = true;
    } else if (newTheme === 'system') {
      useDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    
    // Apply theme class
    root.classList.add(useDark ? 'dark' : 'light');
    setIsDark(useDark);
  };

  const setTheme = async (newTheme: Theme) => {
    try {
      // Save to backend
      const currentSettings = await invoke<any>('get_settings');
      const updatedSettings = {
        ...currentSettings,
        theme: newTheme
      };
      
      await invoke('save_settings', { settings: updatedSettings });
      setThemeState(newTheme);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  };

  // Listen for system theme changes when in system mode
  useEffect(() => {
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => updateTheme('system');
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
} 