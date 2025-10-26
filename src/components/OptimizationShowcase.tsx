import { useState } from 'react';
import { useParallax, useStaggeredAnimation } from '@/hooks/useParallax';
import { useTouchGestures, useLongPress } from '@/hooks/useTouchGestures';
import { useABTest, trackConversion } from '@/hooks/useABTest';
import { useScrollAnimation, useScrollProgress } from '@/hooks/useScrollAnimation';
import { analytics } from '@/lib/analytics';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

/**
 * Demonstration component showcasing all optimization features
 * This shows how to use the new hooks in practice
 */
export function OptimizationShowcase() {
  // A/B Testing Example
  const ctaVariant = useABTest<'control' | 'variant-a' | 'variant-b'>('cta-button-test', 'control');
  
  // Parallax Example
  const parallax1 = useParallax({ speed: 0.3 });
  const parallax2 = useParallax({ speed: 0.6, direction: 'down' });
  
  // Scroll Animation Example
  const { ref: scrollRef, isVisible } = useScrollAnimation({ delay: 200 });
  
  // Touch Gestures Example
  const [swipeMessage, setSwipeMessage] = useState('Swipe me on mobile!');
  const touchRef = useTouchGestures({
    onSwipeLeft: () => {
      setSwipeMessage('Swiped Left! ←');
      analytics.featureUsed('swipe_gesture', { direction: 'left' });
    },
    onSwipeRight: () => {
      setSwipeMessage('Swiped Right! →');
      analytics.featureUsed('swipe_gesture', { direction: 'right' });
    },
  });
  
  // Long Press Example
  const longPressRef = useLongPress(() => {
    alert('Long press detected!');
    analytics.featureUsed('long_press');
  });
  
  // Staggered Animation Example
  const { ref: listRef, visibleItems } = useStaggeredAnimation(4, 150);
  
  // Scroll Progress
  const scrollProgress = useScrollProgress();

  const handleCTAClick = () => {
    analytics.buttonClick(`cta_${ctaVariant}`, 'optimization_showcase');
    trackConversion('cta-button-test', ctaVariant);
  };

  // Get CTA text based on variant
  const getCtaText = () => {
    switch (ctaVariant) {
      case 'variant-a':
        return 'Start Creating Now';
      case 'variant-b':
        return 'Try It Free';
      default:
        return 'Get Started';
    }
  };

  return (
    <div className="space-y-16 py-16">
      {/* Scroll Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-800 z-50">
        <div 
          className="h-full bg-gradient-to-r from-primary-yellow to-primary-orange transition-all duration-300"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Parallax Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div ref={parallax1.ref as any} style={parallax1.style} className="absolute text-9xl opacity-10 font-bold">
          PARALLAX
        </div>
        <div ref={parallax2.ref as any} style={parallax2.style} className="relative z-10">
          <h2 className="text-4xl font-bold text-center mb-4">Parallax Scrolling</h2>
          <p className="text-center text-muted-foreground">Scroll to see the effect</p>
        </div>
      </section>

      {/* Scroll Animation Section */}
      <section
        ref={scrollRef as any}
        className={`transition-all duration-700 ${
          isVisible 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-10'
        }`}
      >
        <Card className="p-8">
          <h3 className="text-2xl font-bold mb-4">Scroll-Triggered Animation</h3>
          <p>This card animates when it enters the viewport</p>
        </Card>
      </section>

      {/* Touch Gestures Section */}
      <section>
        <Card 
          ref={touchRef as any}
          className="p-8 bg-gradient-to-br from-primary-yellow/20 to-primary-orange/20 cursor-grab active:cursor-grabbing touch-none"
        >
          <h3 className="text-2xl font-bold mb-4">Touch Gestures</h3>
          <p className="text-lg">{swipeMessage}</p>
        </Card>

        <Card 
          ref={longPressRef as any}
          className="p-8 mt-4 bg-primary/10 cursor-pointer"
        >
          <p className="text-center">Press and hold me (500ms)</p>
        </Card>
      </section>

      {/* Staggered Animation Section */}
      <section ref={listRef as any}>
        <h3 className="text-2xl font-bold mb-6">Staggered List Animation</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((item, index) => (
            <Card
              key={item}
              className={`p-6 transition-all duration-500 ${
                visibleItems.has(index)
                  ? 'opacity-100 translate-x-0'
                  : 'opacity-0 -translate-x-10'
              }`}
            >
              <h4 className="font-semibold">Feature {item}</h4>
              <p className="text-sm text-muted-foreground">
                Animates with {index * 150}ms delay
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* A/B Testing CTA */}
      <section className="text-center">
        <h3 className="text-2xl font-bold mb-4">A/B Tested CTA</h3>
        <p className="text-muted-foreground mb-6">
          Variant: <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">{ctaVariant}</code>
        </p>
        <Button 
          size="lg"
          onClick={handleCTAClick}
          className="bg-gradient-to-r from-primary-yellow to-primary-orange"
        >
          {getCtaText()}
        </Button>
      </section>
    </div>
  );
}
