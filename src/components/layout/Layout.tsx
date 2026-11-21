import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { Header } from './Header';
import { AudioPlayer } from '@/components/AudioPlayer';
import { useAudioPlayer } from '@/context/AudioPlayerContext';

interface LayoutProps {
  title: string;
  children: ReactNode;
}

export function Layout({ title, children }: LayoutProps) {
  const { currentEpisode } = useAudioPlayer();
  const hasPlayer = !!currentEpisode;

  return (
    <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={title} />
        <main
          className={`flex-1 px-4 py-6 lg:px-8 lg:py-8 animate-fade-in ${
            hasPlayer ? 'pb-40 lg:pb-28' : 'pb-24 lg:pb-8'
          }`}
        >
          <div className="max-w-5xl mx-auto">{children}</div>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <BottomNav />

      {/* Persistent audio player (stays across page navigation) */}
      <AudioPlayer />
    </div>
  );
}
