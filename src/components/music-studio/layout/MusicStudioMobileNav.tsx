import { Home, Sparkles, Music, Search, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MusicStudioView } from '../types/music-studio.types';

interface MobileNavItem {
  id: MusicStudioView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const MOBILE_NAV_ITEMS: MobileNavItem[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'create', label: 'Create', icon: Sparkles },
  { id: 'library', label: 'Library', icon: Music },
  { id: 'discover', label: 'Discover', icon: Search },
  { id: 'favorites', label: 'Favorites', icon: Heart },
];

interface MusicStudioMobileNavProps {
  activeView: MusicStudioView;
  onViewChange: (view: MusicStudioView) => void;
  hasActiveTrack: boolean;
}

export function MusicStudioMobileNav({
  activeView,
  onViewChange,
  hasActiveTrack,
}: MusicStudioMobileNavProps) {
  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border z-50 md:hidden',
        hasActiveTrack ? 'pb-16' : 'pb-0'
      )}
      style={{ paddingBottom: hasActiveTrack ? 'calc(64px + env(safe-area-inset-bottom))' : 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around py-2">
        {MOBILE_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-1.5 rounded-lg transition-colors',
                isActive
                  ? 'text-primary-orange'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
