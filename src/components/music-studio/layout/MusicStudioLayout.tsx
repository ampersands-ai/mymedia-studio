import { useState } from 'react';
import { cn } from '@/lib/utils';
import { AudioPlayerProvider, useAudioPlayer } from '../hooks/useAudioStudioPlayer';
import { MusicStudioSidebar } from './MusicStudioSidebar';
import { MusicStudioMobileNav } from './MusicStudioMobileNav';
import { PersistentAudioPlayer, MiniAudioPlayer } from './PersistentAudioPlayer';
import { FullScreenPlayer } from './FullScreenPlayer';
import { AudioQueueSheet } from './AudioQueueSheet';
import type { MusicStudioView } from '../types/music-studio.types';

interface MusicStudioLayoutProps {
  children: React.ReactNode;
  activeView: MusicStudioView;
  onViewChange: (view: MusicStudioView) => void;
}

function LayoutContent({ children, activeView, onViewChange }: MusicStudioLayoutProps) {
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isQueueOpen, setQueueOpen] = useState(false);
  const { currentTrack, isFullScreen } = useAudioPlayer();
  const hasActiveTrack = !!currentTrack;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-background">
      <div className="md:flex">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <MusicStudioSidebar
            activeView={activeView}
            onViewChange={onViewChange}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!isSidebarCollapsed)}
          />
        </div>

        {/* Main Content (page scrolls so footer is reachable) */}
        <main className={cn('flex-1 transition-all duration-300')}>
          <div className="p-4 md:p-6 pb-32 md:pb-24">{children}</div>
        </main>
      </div>

      {/* Desktop Player */}
      <PersistentAudioPlayer onOpenQueue={() => setQueueOpen(true)} />

      {/* Mobile Player + Nav */}
      <MiniAudioPlayer />
      <MusicStudioMobileNav
        activeView={activeView}
        onViewChange={onViewChange}
        hasActiveTrack={hasActiveTrack}
      />

      {/* Full Screen Player */}
      {isFullScreen && <FullScreenPlayer />}

      {/* Queue Sheet */}
      <AudioQueueSheet open={isQueueOpen} onOpenChange={setQueueOpen} />
    </div>
  );
}

export function MusicStudioLayout(props: MusicStudioLayoutProps) {
  return (
    <AudioPlayerProvider>
      <LayoutContent {...props} />
    </AudioPlayerProvider>
  );
}
