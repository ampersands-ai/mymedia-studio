import { Home, Sparkles, Music, Search, Trophy, Heart, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AudioStudioView, NavItem } from '../types/audio-studio.types';

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'create', label: 'Create', icon: Sparkles },
  { id: 'library', label: 'My Library', icon: Music },
  { id: 'discover', label: 'Discover', icon: Search },
  { id: 'charts', label: 'Charts', icon: Trophy },
  { id: 'favorites', label: 'Favorites', icon: Heart },
  { id: 'settings', label: 'Settings', icon: Settings },
];

interface AudioStudioSidebarProps {
  activeView: AudioStudioView;
  onViewChange: (view: AudioStudioView) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function AudioStudioSidebar({
  activeView,
  onViewChange,
  isCollapsed,
  onToggleCollapse,
}: AudioStudioSidebarProps) {
  return (
    <aside
      className={cn(
        'sticky top-16 h-[calc(100vh-64px-80px)] bg-card border-r border-border transition-all duration-300 z-40 shrink-0',
        isCollapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Toggle Button */}
      <button
        onClick={onToggleCollapse}
        className="absolute -right-3 top-6 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        {isCollapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </button>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-3 overflow-y-auto flex-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary-orange/20 text-primary-orange'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                isCollapsed && 'justify-center px-2'
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-primary-orange')} />
              {!isCollapsed && (
                <span className="truncate">{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Branding at bottom */}
      {!isCollapsed && (
        <div className="absolute bottom-4 left-0 right-0 px-4">
          <div className="rounded-lg bg-gradient-to-r from-primary-orange/10 to-accent-purple/10 p-3 border border-primary-orange/20">
            <p className="text-xs font-semibold text-foreground">Music Studio</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Powered by AI</p>
          </div>
        </div>
      )}
    </aside>
  );
}
