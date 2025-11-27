import { ReactNode, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface LoadingTransitionProps {
  isLoading: boolean;
  skeleton: ReactNode;
  children: ReactNode;
  transition?: 'fade' | 'slide-up' | 'scale';
  className?: string;
  minDisplayTime?: number;
}

export function LoadingTransition({
  isLoading,
  skeleton,
  children,
  transition = 'fade',
  className,
  minDisplayTime = 0
}: LoadingTransitionProps) {
  const [showSkeleton, setShowSkeleton] = useState(isLoading);
  const [hasShownSkeleton, setHasShownSkeleton] = useState(false);
  
  useEffect(() => {
    if (isLoading) {
      setShowSkeleton(true);
      setHasShownSkeleton(true);
    } else if (hasShownSkeleton && minDisplayTime > 0) {
      // Enforce minimum display time
      const timer = setTimeout(() => {
        setShowSkeleton(false);
      }, minDisplayTime);
      return () => clearTimeout(timer);
    } else {
      setShowSkeleton(false);
    }
    return undefined;
  }, [isLoading, minDisplayTime, hasShownSkeleton]);
  
  const transitionClasses = {
    fade: 'animate-fade-in',
    'slide-up': 'animate-slide-up',
    scale: 'animate-scale-in'
  };
  
  if (showSkeleton) {
    return <div className={className}>{skeleton}</div>;
  }
  
  return (
    <div className={cn(transitionClasses[transition], className)}>
      {children}
    </div>
  );
}
