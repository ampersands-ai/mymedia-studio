import { useState } from 'react';
import { AudioStudioLayout } from '@/components/audio-studio/layout/AudioStudioLayout';
import { HomeView } from '@/components/audio-studio/views/HomeView';
import { CreateView } from '@/components/audio-studio/views/CreateView';
import { LibraryView } from '@/components/audio-studio/views/LibraryView';
import { DiscoverView } from '@/components/audio-studio/views/DiscoverView';
import { ChartsView } from '@/components/audio-studio/views/ChartsView';
import { FavoritesView } from '@/components/audio-studio/views/FavoritesView';
import { SettingsView } from '@/components/audio-studio/views/SettingsView';
import type { AudioStudioView, CreateTab } from '@/components/audio-studio/types/audio-studio.types';

export default function AudioStudioPage() {
  const [activeView, setActiveView] = useState<AudioStudioView>('home');
  const [createTab, setCreateTab] = useState<CreateTab>('song');
  const [initialPrompt, setInitialPrompt] = useState('');

  const handleNavigateToCreate = (tab?: CreateTab, prompt?: string) => {
    if (tab) setCreateTab(tab);
    if (prompt !== undefined) setInitialPrompt(prompt);
    setActiveView('create');
  };

  const renderView = () => {
    switch (activeView) {
      case 'home':
        return <HomeView onNavigateToCreate={handleNavigateToCreate} />;
      case 'create':
        return <CreateView initialTab={createTab} initialPrompt={initialPrompt} />;
      case 'library':
        return <LibraryView />;
      case 'discover':
        return <DiscoverView />;
      case 'charts':
        return <ChartsView />;
      case 'favorites':
        return <FavoritesView />;
      case 'settings':
        return <SettingsView />;
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
