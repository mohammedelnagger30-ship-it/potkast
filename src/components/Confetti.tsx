import { useEffect, useRef } from 'react';

interface ConfettiConfig {
  particleCount?: number;
  spread?: number;
  startVelocity?: number;
  decay?: number;
  gravity?: number;
  drift?: number;
  flat?: boolean;
  ticks?: number;
  origin?: { x?: number; y?: number };
  colors?: string[];
  shapes?: ('circle' | 'square')[];
  scalar?: number;
}

declare global {
  interface Window {
    confetti: (config: ConfettiConfig) => void;
  }
}

let loaded = false;

function ensureLoaded() {
  if (loaded || document.getElementById('confetti-script')) {
    loaded = true;
    return;
  }
  const script = document.createElement('script');
  script.id = 'confetti-script';
  script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js';
  script.async = true;
  document.head.appendChild(script);
  loaded = true;
}

export function fireConfetti() {
  ensureLoaded();

  const fire = () => {
    if (!window.confetti) return;

    window.confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#0F766E', '#D4A017', '#10B981', '#34D399', '#FBBF24'],
      ticks: 200,
    });

    setTimeout(() => {
      window.confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#0F766E', '#D4A017', '#10B981'],
      });
    }, 200);
  };

  if (typeof window !== 'undefined' && typeof window.confetti === 'function') {
    fire();
  } else {
    // Wait for script to load
    const interval = setInterval(() => {
      if (typeof window !== 'undefined' && typeof window.confetti === 'function') {
        clearInterval(interval);
        fire();
      }
    }, 100);
    setTimeout(() => clearInterval(interval), 3000);
  }
}

export function ConfettiLoader() {
  const ref = useRef(false);
  useEffect(() => {
    if (!ref.current) {
      ensureLoaded();
      ref.current = true;
    }
  }, []);
  return null;
}
