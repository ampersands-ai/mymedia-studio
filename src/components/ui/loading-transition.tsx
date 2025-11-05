import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface LoadingTransitionProps {
  isLoading: boolean;
  skeleton: ReactNode;
  children: ReactNode;
  transition?: 'fade' | 'slide-up' | 'scale';
  className?: string;
}

export function LoadingTransition({
  isLoading,
  skeleton,
  children,
  transition = 'fade',
  className
}: LoadingTransitionProps) {
  const transitionClasses = {
    fade: 'animate-fade-in',
    'slide-up': 'animate-slide-up',
    scale: 'animate-scale-in'
  };
  
  if (isLoading) {
    return <div className={className}>{skeleton}</div>;
  }
  
  return (
    <div className={cn(transitionClasses[transition], className)}>
      {children}
    </div>
  );
}
