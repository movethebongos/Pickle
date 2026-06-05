import { useState, useEffect, useRef } from 'react';
import { GlassPanel } from './AppShell.tsx';
import GlassButton from './GlassButton.tsx';
import PaypalIcon from '../assets/paypal-mark-color.svg';

export default function AboutPage() {
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      // If the modal is open and the click target is NOT inside the modal content box, close it
      if (isOpen && modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  return (
    <div className="relative p-6">
      <GlassButton compact onClick={() => setIsOpen(true)}>
        About
      </GlassButton>

      {/* Modal Overlay Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          {/* Modal Content Box (Attached to the Ref) */}
          <GlassPanel>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-left">
                <div ref={modalRef}>
                    <div>
                        <h3 className="text-xl font-semibold">About</h3>
                        <p className="text-sm font-medium text-[var(--pickle-text-muted)]">Version 1.0.0</p>
                    </div>
                    <div className="mt-4 space-y-3 text-sm font-medium text-[var(--pickle-text)] leading-relaxed">
                        <p>Pickle is free, non-tracking and ad-free. If you’d like to support it, donations are appreciated ❤️</p>
                            <div className="relative snugasapug">
                                <GlassButton block accent onClick={() => window.open('https://www.paypal.com/donate/?business=RL397JDFGTPH6&no_recurring=0&currency_code=SEK')}>
                                    <img src={PaypalIcon} alt="PayPal" className="h-6 w-6 paypalmr" />
                                    PayPal (sorry)
                                </GlassButton>
                            </div>
                        <h4 className="text-xl font-semibold">Credits</h4>
                        <p>Match sound effect: <strong>“Congrats! 2”</strong> by <em>nomiqbomi</em> — <a href="https://freesound.org/s/578572/" target="_blank" rel="noopener noreferrer">https://freesound.org/s/578572/</a> — License: Creative Commons 0.</p>
                        <p>This product uses the TMDb API but is not endorsed or certified by TMDb.</p>
                        <p className="text-sm font-medium text-[var(--pickle-text-muted)]"> &copy; 2025-{new Date().getFullYear()} Samson Nadier Wiklund. All rights reserved. <a href="https://www.samsonwiklund.se" target="_blank" rel="noopener noreferrer">SamsonWiklund.se</a></p>
                    </div>
                    <div className="mt-6 flex justify-end snugasapug hangright">
                        <GlassButton compact onClick={() => setIsOpen(false)}>
                             close
                        </GlassButton>
                    </div>
                </div>
            </div>  
            </GlassPanel>          
          </div>
      )}
    </div>
  );
}