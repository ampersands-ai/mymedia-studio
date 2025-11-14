import { ReactNode, useState } from 'react';
import { useInView } from 'react-intersection-observer';

interface LazyCarouselProps {
  children: ReactNode;
  fallback?: ReactNode;
  priority?: boolean;
}

/**
 * LazyCarousel - Renders carousel content only when it enters the viewport
 * Reduces initial render time by deferring off-screen carousel rendering
 */
export const LazyCarousel = ({ children, fallback = null, priority = false }: LazyCarouselProps) => {
  const [hasRendered, setHasRendered] = useState(priority);

  const { ref } = useInView({
    threshold: 0,
    triggerOnce: true,
    rootMargin: '400px', // Start loading 400px before visible
    onChange: (inView) => {
      if (inView && !hasRendered) {
        setHasRendered(true);
      }
    },
    skip: priority,
  });

  if (priority || hasRendered) {
    return <>{children}</>;
  }

  return <div ref={ref}>{fallback}</div>;
};
