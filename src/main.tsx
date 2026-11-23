import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { ThemeProvider } from '@/context/ThemeContext';
import { TextScaleProvider } from '@/context/TextScaleContext';
import { AuthProvider } from '@/context/AuthContext';
import { AudioPlayerProvider } from '@/context/AudioPlayerContext';
import { DownloadProvider } from '@/context/DownloadContext';
import { ProgressProvider } from '@/context/ProgressContext';
import { UpdateProvider } from '@/context/UpdateContext';
import { loadQuickPlayIndex } from '@/lib/quickPlay';
import './index.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// The inline boot shell owns the very first paint. Hand over only after React
// has produced a frame so the user never sees an empty #root.
function finishBoot() {
  const shell = document.getElementById('boot-shell');
  if (!shell || shell.classList.contains('is-ready')) return;
  shell.classList.add('is-ready');
  const remove = () => shell.remove();
  shell.addEventListener('transitionend', remove, { once: true });
  window.setTimeout(remove, 260);
}

// Fetch the real-catalog play index after the first paint. By the time the
// user reaches a podcast list, play buttons can start audio synchronously.
const startIndexLoad = () => { void loadQuickPlayIndex(); };
const idleCallback = (window as Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
}).requestIdleCallback;
if (typeof idleCallback === 'function') {
  idleCallback.call(window, startIndexLoad, { timeout: 1500 });
} else {
  window.setTimeout(startIndexLoad, 300);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <TextScaleProvider>
        <AuthProvider>
          <UpdateProvider>
            <DownloadProvider>
              <ProgressProvider>
                <AudioPlayerProvider>
                  <BrowserRouter>
                    <App />
                  </BrowserRouter>
                </AudioPlayerProvider>
              </ProgressProvider>
            </DownloadProvider>
          </UpdateProvider>
        </AuthProvider>
      </TextScaleProvider>
    </ThemeProvider>
  </StrictMode>
);

window.requestAnimationFrame(() => window.requestAnimationFrame(finishBoot));
