import { useState } from 'react';
import { AudioStudioLayout } from '@/components/audio-studio/layout/AudioStudioLayout';
import { HomeView } from '@/components/audio-studio/views/HomeView';
import { CreateView } from '@/components/audio-studio/views/CreateView';
import { LibraryView } from '@/components/audio-studio/views/LibraryView';
import { EmptyState } from '@/components/audio-studio/shared/EmptyState';
import type { AudioStudioView, CreateTab } from '@/components/audio-studio/types/audio-studio.types';

export default function AudioStudioPage() {
  const [activeView, setActiveView] = useState<AudioStudioView>('home');
  const [createTab, setCreateTab] = useState<CreateTab>('song');

  const handleNavigateToCreate = (tab?: CreateTab) => {
    if (tab) setCreateTab(tab);
    setActiveView('create');
  };

  const renderView = () => {
    switch (activeView) {
      case 'home':
        return <HomeView onNavigateToCreate={handleNavigateToCreate} />;
      case 'create':
        return <CreateView initialTab={createTab} />;
      case 'library':
        return <LibraryView />;
      case 'favorites':
        return <EmptyState type="favorites" />;
      case 'discover':
      case 'charts':
      case 'settings':
        return (
          <div className="text-center py-16">
            <h2 className="text-xl font-bold text-foreground mb-2 capitalize">{activeView}</h2>
            <p className="text-muted-foreground">Coming soon</p>
          </div>
        );
      default:
        return <HomeView onNavigateToCreate={handleNavigateToCreate} />;
    }
  };

  return (
    <AudioStudioLayout activeView={activeView} onViewChange={setActiveView}>
      {renderView()}
    </AudioStudioLayout>
  );
}
