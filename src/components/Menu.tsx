import { useState } from 'react';
import DarkModeToggle from './DarkModeToggle.tsx';
import AboutPage from './AboutPage.tsx';
import GlassButton from './GlassButton.tsx';
import { GlassPanel } from './AppShell.tsx';
import ScrollToBottom from './ScrollToBottom.tsx';

interface MenuProps {
  isHost: boolean;
  screen?: 'settings' | 'swipe';
}

export default function Menu({ isHost, screen }: MenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="pickle-app__toolbar">
      <GlassPanel>
        <div className="relative pb-6">
          <GlassButton compact onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? '✕' : '☰'}
          </GlassButton>
        </div>
        {isHost && screen === 'settings' && (
          <div className="relative pb-6">
            <ScrollToBottom />
          </div>
        )}
        {isOpen && (
          <div className="menu">
            <DarkModeToggle />
            <AboutPage />
          </div>
        )}
      </GlassPanel>
    </div>
  );
}
