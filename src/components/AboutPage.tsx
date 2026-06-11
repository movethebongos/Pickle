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
                <div>
                    <h3 className="font-bold">About</h3>
                    <p className="text-sm opacity-70">Version 1.0.0</p>
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
                <div className="relative">
                <GlassButton onClick={() => setIsOpen(false)}>
                    Close
                </GlassButton>
                </div>
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
