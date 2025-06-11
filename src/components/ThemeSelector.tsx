import { useTheme, Theme } from '../context/ThemeContext';
import { Sun, Moon, Monitor } from 'lucide-react';

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  const themes: { value: Theme; label: string; icon: React.ComponentType<any> }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-text-primary">Theme</div>
      <div className="flex gap-2">
        {themes.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200
              ${theme === value
                ? 'bg-accent-primary text-white border-accent-primary'
                : 'bg-background-secondary text-text-secondary border-border-primary hover:border-border-secondary hover:text-text-primary'
              }
            `}
          >
            <Icon className="w-4 h-4" />
            <span className="text-sm">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
} 