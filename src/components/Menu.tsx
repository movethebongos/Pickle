import { useState } from 'react';
import DarkModeToggle from './DarkModeToggle.tsx';
import AboutPage from './AboutPage.tsx';
import GlassButton from './GlassButton.tsx';
import { GlassPanel } from './AppShell.tsx';
import ScrollToBottom from './ScrollToBottom.tsx';

// Fix: Properly define the props interface
interface MenuProps {
  isHost: boolean;
}

export default function Menu({ isHost }: MenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  return (
      <div className="pickle-app__toolbar">
        <GlassPanel>
            <div className="relative pb6">
                <GlassButton compact onClick={() => setIsOpen(!isOpen)}>
                     {isOpen ? '✕' : '☰'}
                </GlassButton>
            </div>
            {/* Fix: Remove the semicolon after the condition */}
            {isHost && (
                <div className="relative pb6">
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