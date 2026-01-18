import { useState } from 'react';
import { cn } from '@/lib/utils';
import { AudioPlayerProvider, useAudioPlayer } from '../hooks/useAudioStudioPlayer';
import { AudioStudioSidebar } from './AudioStudioSidebar';
import { AudioStudioMobileNav } from './AudioStudioMobileNav';
import { PersistentAudioPlayer, MiniAudioPlayer } from './PersistentAudioPlayer';
import { FullScreenPlayer } from './FullScreenPlayer';
import { AudioQueueSheet } from './AudioQueueSheet';
import type { AudioStudioView } from '../types/audio-studio.types';

interface AudioStudioLayoutProps {
  children: React.ReactNode;
  activeView: AudioStudioView;
  onViewChange: (view: AudioStudioView) => void;
}

function LayoutContent({ children, activeView, onViewChange }: AudioStudioLayoutProps) {
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isQueueOpen, setQueueOpen] = useState(false);
  const { currentTrack, isFullScreen } = useAudioPlayer();
  const hasActiveTrack = !!currentTrack;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-background">
      <div className="md:flex">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <AudioStudioSidebar
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
      <AudioStudioMobileNav
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

export function AudioStudioLayout(props: AudioStudioLayoutProps) {
  return (
    <AudioPlayerProvider>
      <LayoutContent {...props} />
    </AudioPlayerProvider>
  );
}
