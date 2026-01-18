import { useState } from 'react';
import { Music, Loader2 } from 'lucide-react';
import { MusicStudioLayout } from '@/components/music-studio/layout/MusicStudioLayout';
import { HomeView } from '@/components/music-studio/views/HomeView';
import { CreateView } from '@/components/music-studio/views/CreateView';
import { LibraryView } from '@/components/music-studio/views/LibraryView';
import { DiscoverView } from '@/components/music-studio/views/DiscoverView';
import { ChartsView } from '@/components/music-studio/views/ChartsView';
import { FavoritesView } from '@/components/music-studio/views/FavoritesView';
import { SettingsView } from '@/components/music-studio/views/SettingsView';
import { useAdminRole } from '@/hooks/useAdminRole';
import type { MusicStudioView, CreateTab } from '@/components/music-studio/types/music-studio.types';

export default function MusicStudioPage() {
  const { isAdmin, loading } = useAdminRole();
  const [activeView, setActiveView] = useState<MusicStudioView>('home');
  const [createTab, setCreateTab] = useState<CreateTab>('song');
  const [initialPrompt, setInitialPrompt] = useState('');

  // Show loading state while checking admin role
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-orange" />
      </div>
    );
  }

  // Show Coming Soon for non-admins
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto h-20 w-20 rounded-2xl bg-gradient-to-br from-primary-orange/20 via-accent-purple/20 to-accent-pink/20 flex items-center justify-center border border-border">
            <Music className="h-10 w-10 text-primary-orange" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-foreground">Music Studio</h1>
            <p className="text-xl font-semibold text-primary-orange">Coming Soon</p>
          </div>
          <p className="text-muted-foreground">
            We're working hard to bring you AI-powered music generation, voice transformation, and sound effects. Stay tuned!
          </p>
        </div>
      </div>
    );
  }

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
    <MusicStudioLayout activeView={activeView} onViewChange={setActiveView}>
      {renderView()}
    </MusicStudioLayout>
  );
}
