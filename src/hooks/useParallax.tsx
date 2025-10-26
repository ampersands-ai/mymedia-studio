import { useEffect, useRef, useState } from 'react';

interface ParallaxOptions {
  speed?: number; // 0.1 to 1 (slower to faster)
  direction?: 'up' | 'down';
  disabled?: boolean;
}

/**
 * Parallax scroll effect hook
 * Creates depth by moving elements at different speeds
 */
export function useParallax(options: ParallaxOptions = {}) {
  const { speed = 0.5, direction = 'up', disabled = false } = options;
  const ref = useRef<HTMLElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (disabled) return;

    let ticking = false;
    let elementTop = 0;

    const updateElementTop = () => {
      if (ref.current) {
        elementTop = ref.current.getBoundingClientRect().top + window.scrollY;
      }
    };

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrolled = window.scrollY;
          const elementPosition = scrolled - elementTop;
          const parallaxOffset = elementPosition * speed;
          
          setOffset(direction === 'up' ? -parallaxOffset : parallaxOffset);
          ticking = false;
        });
        ticking = true;
      }
    };

    updateElementTop();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', updateElementTop, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateElementTop);
    };
  }, [speed, direction, disabled]);

  return {
    ref,
    style: {
      transform: `translateY(${offset}px)`,
      willChange: 'transform',
    },
  };
}

/**
 * Staggered animation hook for lists
 */
export function useStaggeredAnimation(itemCount: number, delay = 100) {
  const [visibleItems, setVisibleItems] = useState<Set<number>>(new Set());
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Reveal items one by one
          for (let i = 0; i < itemCount; i++) {
            setTimeout(() => {
              setVisibleItems((prev) => new Set([...prev, i]));
            }, i * delay);
          }
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [itemCount, delay]);

  return { ref, visibleItems };
}
