import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { GlassPanel } from './AppShell.tsx';
import GlassButton from './GlassButton.tsx';
import PaypalIcon from '../assets/paypal-mark-color.svg';

export default function AboutPage() {
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (isOpen && modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const modalContent = (
    <div ref={modalRef} className="menu-popup">
        <GlassPanel>
            <div className="p-4 space-y-4">
               <div className="relative snugasapug hangright">
                  <GlassButton onClick={() => setIsOpen(false)}>
                      ✕
                  </GlassButton>
                </div>
                <div>
                    <h3 className="font-bold">Pickle</h3>
                    <p className="text-sm opacity-70">Version 1.35</p>
                </div>
                <p className="text-sm">
                    Pickle is free, non-tracking and ad-free. If you’d like to support it, donations are appreciated ❤️
                </p>
                <div className="relative snugasapug">
                    <GlassButton block accent onClick={() => window.open('https://www.paypal.com/donate/?business=RL397JDFGTPH6&no_recurring=0&currency_code=SEK')}>
                        <img src={PaypalIcon} alt="PayPal" className="h-6 w-6 paypalmr" />
                        PayPal (sorry)
                    </GlassButton>
                </div>
                <h4 className="font-semibold">Credits</h4>
                <p className="text-sm">
                  Uses the TMDb API but is not endorsed or certified by <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer">TMDb</a>.
                </p>
                <p className="text-sm">
                    Glass theme inspired by Apple’s design language and created using "Glass Button" by Petr Knoll <a href="https://codepen.io/Petr-Knoll/pen/QwWLZdx" target="_blank" rel="noopener noreferrer">https://codepen.io/Petr-Knoll/pen/QwWLZdx</a> as a reference point.
                </p>
                <p className="text-sm">
                    Pickle sound effect: <strong>“Congrats! 2”</strong> by <em>nomiqbomi</em> — <a href="https://freesound.org/s/578572/" target="_blank" rel="noopener noreferrer">https://freesound.org/s/578572/</a> — License: Creative Commons 0.
                </p>
                <p className="text-sm">
                   &copy; 2025-{(new Date().getFullYear())} Samson Nadier Wiklund. All rights reserved.
                </p>
               
            </div>
        </GlassPanel>
    </div>
  );

  return (
    <>
      <GlassButton compact onClick={() => setIsOpen(true)}>
        About
      </GlassButton>
      {isMounted && isOpen ? createPortal(modalContent, document.body) : null}
    </>
  );
}
