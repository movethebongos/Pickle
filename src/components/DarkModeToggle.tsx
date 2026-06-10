import { useTheme } from '../ThemeProvider.tsx';
import GlassButton from './GlassButton.tsx';


export default function DarkModeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
        <div className="relative pb6">
          <GlassButton compact onClick={toggleTheme} className="stb-button" role="switch"
            aria-checked={isDark}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
            {isDark ? '☾ Dark' : '☀ Light'}
          </GlassButton>
        </div>
    
  );
}
