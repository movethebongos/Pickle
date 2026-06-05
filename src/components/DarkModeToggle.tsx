import { useTheme } from '../ThemeProvider.tsx';

export default function DarkModeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      className="theme-switch"
      role="switch"
      aria-checked={isDark}
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span className="theme-switch__track">
        <span className="theme-switch__label">{isDark ? 'Dark' : 'Light'}</span>
        <span className="theme-switch__thumb" aria-hidden="true">
          {isDark ? '☀' : '☾'}
        </span>
      </span>
    </button>
  );
}
