import { ReactNode } from 'react';
import { useInView } from 'react-intersection-observer';
import { Skeleton } from './ui/skeleton';

interface LazyGridItemProps {
  children: ReactNode;
  className?: string;
  fallback?: ReactNode;
  priority?: boolean;
}

/**
 * LazyGridItem - Renders grid item content only when it enters viewport
 * Reduces initial render time for large grids (e.g., History page)
 */
export const LazyGridItem = ({
  children,
  className = '',
  fallback,
  priority = false
}: LazyGridItemProps) => {
  const { ref, inView } = useInView({
    threshold: 0,
    triggerOnce: true,
    rootMargin: '300px', // Start loading 300px before visible
    skip: priority,
  });

  if (priority || inView) {
    return <>{children}</>;
  }

  return (
    <div ref={ref} className={className}>
      {fallback || <Skeleton className="w-full aspect-square" />}
    </div>
  );
};
