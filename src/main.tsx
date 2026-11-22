import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import { AudioPlayerProvider } from '@/context/AudioPlayerContext';
import { DownloadProvider } from '@/context/DownloadContext';
import { ProgressProvider } from '@/context/ProgressContext';
import { UpdateProvider } from '@/context/UpdateContext';
import './index.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
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
    </ThemeProvider>
  </StrictMode>
);
