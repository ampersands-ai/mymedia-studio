import { Music, Heart, Search, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type EmptyStateType = 'library' | 'favorites' | 'search' | 'drafts';

interface EmptyStateProps {
  type: EmptyStateType;
  onAction?: () => void;
  className?: string;
}

const EMPTY_STATES: Record<EmptyStateType, { icon: React.ComponentType<{ className?: string }>; title: string; description: string; action?: string }> = {
  library: {
    icon: Music,
    title: 'No tracks yet',
    description: 'Start creating music and your tracks will appear here.',
    action: 'Create Your First Track',
  },
  favorites: {
    icon: Heart,
    title: 'No favorites yet',
    description: 'Like tracks to add them to your favorites.',
  },
  search: {
    icon: Search,
    title: 'No results found',
    description: 'Try adjusting your search or filters.',
  },
  drafts: {
    icon: Sparkles,
    title: 'No drafts',
    description: "Your work in progress will appear here.",
    action: 'Start Creating',
  },
};

export function EmptyState({ type, onAction, className }: EmptyStateProps) {
  const state = EMPTY_STATES[type];
  const Icon = state.icon;

  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4', className)}>
      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary-orange/20 to-accent-purple/20 flex items-center justify-center mb-4 border border-border">
        <Icon className="h-8 w-8 text-primary-orange" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{state.title}</h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">{state.description}</p>
      {state.action && onAction && (
        <Button onClick={onAction} className="bg-primary-orange hover:bg-primary-orange/90 text-black">
          {state.action}
        </Button>
      )}
    </div>
  );
}
