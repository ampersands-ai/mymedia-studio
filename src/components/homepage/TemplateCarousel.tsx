import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { GlassCard } from '@/components/ui/glass-card';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { Play } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface Template {
  id: string;
  name: string;
  category: string;
  thumbnail_url: string | null;
  icon?: string;
}

interface TemplateCarouselProps {
  templates: Template[];
}

export const TemplateCarousel = ({ templates }: TemplateCarouselProps) => {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { 
      loop: true,
      align: 'center',
      skipSnaps: false,
      slidesToScroll: 1,
    },
    [Autoplay({ delay: 3000, stopOnInteraction: false })]
  );

  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  if (!templates || templates.length === 0) return null;

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Explore{' '}
            <span className="bg-gradient-to-r from-primary-yellow to-primary-orange bg-clip-text text-transparent">
              Templates
            </span>
          </h2>
          <p className="text-xl text-gray-800 dark:text-gray-200">
            Get inspired by thousands of AI-generated creations
          </p>
        </div>

        {/* Carousel */}
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-6">
            {templates.slice(0, 12).map((template, index) => (
              <div
                key={template.id}
                className="flex-[0_0_90%] sm:flex-[0_0_60%] md:flex-[0_0_40%] lg:flex-[0_0_30%] min-w-0"
                style={{
                  transform: selectedIndex === index ? 'scale(1.05)' : 'scale(0.95)',
                  transition: 'transform 0.3s ease',
                  zIndex: selectedIndex === index ? 10 : 1,
                }}
              >
                <GlassCard hover className="overflow-hidden group h-full">
                  {/* Thumbnail */}
                  <div className="relative aspect-[9/16] overflow-hidden bg-gray-200 dark:bg-gray-800">
                    {template.thumbnail_url ? (
                      <OptimizedImage
                        src={template.thumbnail_url}
                        alt={template.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        isSupabaseImage={template.thumbnail_url.includes('supabase')}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-6xl">
                        {template.icon || '🎨'}
                      </div>
                    )}

                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-0 left-0 right-0 p-6">
                        <button className="w-full py-3 px-6 rounded-full bg-white text-black font-semibold hover:scale-105 transition-transform flex items-center justify-center space-x-2">
                          <Play className="w-5 h-5" />
                          <span>Use Template</span>
                        </button>
                      </div>
                    </div>

                    {/* Category badge */}
                    <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm text-xs font-semibold">
                      {template.category}
                    </div>
                  </div>

                  {/* Card footer */}
                  <div className="p-4">
                    <h3 className="font-semibold text-lg line-clamp-2">
                      {template.name}
                    </h3>
                  </div>
                </GlassCard>
              </div>
            ))}
          </div>
        </div>

        {/* Pagination dots */}
        <div className="flex justify-center gap-2 mt-8">
          {templates.slice(0, 12).map((_, index) => (
            <button
              key={index}
              onClick={() => emblaApi?.scrollTo(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                selectedIndex === index 
                  ? 'w-8 bg-gradient-to-r from-primary-yellow to-primary-orange' 
                  : 'bg-gray-300 dark:bg-gray-700'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
