import { useState } from 'react';
import { cn } from '@/lib/utils';
import { AudioPlayerProvider, useAudioPlayer } from '../hooks/useAudioStudioPlayer';
import { AudioStudioSidebar } from './AudioStudioSidebar';
import { AudioStudioMobileNav } from './AudioStudioMobileNav';
import { PersistentAudioPlayer, MiniAudioPlayer } from './PersistentAudioPlayer';
import type { AudioStudioView } from '../types/audio-studio.types';

interface AudioStudioLayoutProps {
  children: React.ReactNode;
  activeView: AudioStudioView;
  onViewChange: (view: AudioStudioView) => void;
}

function LayoutContent({ children, activeView, onViewChange }: AudioStudioLayoutProps) {
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { currentTrack } = useAudioPlayer();
  const hasActiveTrack = !!currentTrack;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <AudioStudioSidebar
          activeView={activeView}
          onViewChange={onViewChange}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>

      {/* Main Content */}
      <main
        className={cn(
          'transition-all duration-300 pb-24 md:pb-24',
          // Desktop: account for sidebar
          isSidebarCollapsed ? 'md:ml-16' : 'md:ml-60',
          // Mobile: full width with bottom padding for nav
          'ml-0'
        )}
      >
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>

      {/* Desktop Player */}
      <PersistentAudioPlayer />

      {/* Mobile Player + Nav */}
      <MiniAudioPlayer />
      <AudioStudioMobileNav
        activeView={activeView}
        onViewChange={onViewChange}
        hasActiveTrack={hasActiveTrack}
      />
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
