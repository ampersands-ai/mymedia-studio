import { cn } from '@/lib/utils';
import type { GenreOption } from '../types/audio-studio.types';

interface GenreCardProps {
  genre: GenreOption;
  isSelected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

const GENRE_GRADIENTS: Record<string, string> = {
  'pop': 'from-pink-500/20 to-purple-500/20',
  'rock': 'from-red-500/20 to-orange-500/20',
  'hip-hop': 'from-yellow-500/20 to-orange-500/20',
  'r&b': 'from-purple-500/20 to-pink-500/20',
  'country': 'from-amber-500/20 to-yellow-500/20',
  'electronic': 'from-cyan-500/20 to-blue-500/20',
  'jazz': 'from-amber-600/20 to-brown-500/20',
  'classical': 'from-slate-400/20 to-slate-500/20',
  'lo-fi': 'from-indigo-500/20 to-purple-500/20',
  'ambient': 'from-teal-500/20 to-cyan-500/20',
  'metal': 'from-gray-700/20 to-gray-900/20',
  'reggae': 'from-green-500/20 to-yellow-500/20',
  'latin': 'from-red-500/20 to-yellow-500/20',
  'k-pop': 'from-pink-400/20 to-blue-500/20',
  'indie': 'from-emerald-500/20 to-teal-500/20',
};

export function GenreCard({ genre, isSelected, onClick, size = 'md' }: GenreCardProps) {
  const sizeClasses = {
    sm: 'p-2 rounded-lg',
    md: 'p-4 rounded-xl',
    lg: 'p-6 rounded-2xl',
  };

  const iconSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center gap-2 border transition-all duration-200',
        'bg-gradient-to-br hover:scale-105 hover:shadow-lg',
        GENRE_GRADIENTS[genre.value] || 'from-primary-orange/20 to-accent-purple/20',
        isSelected
          ? 'border-primary-orange shadow-lg shadow-primary-orange/20'
          : 'border-border hover:border-primary-orange/50',
        sizeClasses[size]
      )}
    >
      <span className={iconSizes[size]}>{genre.icon}</span>
      <span className={cn('font-medium text-foreground', textSizes[size])}>{genre.label}</span>
    </button>
  );
}
