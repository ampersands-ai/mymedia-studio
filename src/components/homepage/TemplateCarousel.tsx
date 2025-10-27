import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay, EffectCoverflow } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-coverflow';
import { GlassCard } from '@/components/ui/glass-card';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { OptimizedVideo } from '@/components/ui/optimized-video';
import { Play } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  category: string;
  thumbnail_url: string | null;
  icon?: string;
  videoUrl?: string;
  author?: {
    name: string;
    avatar: string;
  };
}

interface TemplateCarouselProps {
  templates: Template[];
}

export const TemplateCarousel = ({ templates }: TemplateCarouselProps) => {
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

        {/* Swiper Carousel */}
        <Swiper
          modules={[Navigation, Pagination, Autoplay, EffectCoverflow]}
          effect="coverflow"
          grabCursor={true}
          centeredSlides={true}
          slidesPerView="auto"
          coverflowEffect={{
            rotate: 50,
            stretch: 0,
            depth: 100,
            modifier: 1,
            slideShadows: true,
          }}
          pagination={{ 
            clickable: true,
            dynamicBullets: true,
          }}
          navigation={true}
          autoplay={{
            delay: 3000,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          }}
          loop={true}
          className="template-carousel"
        >
          {templates.slice(0, 12).map((template) => (
            <SwiperSlide key={template.id}>
              <GlassCard hover className="overflow-hidden group h-full">
                {/* Thumbnail/Video */}
                <div className="relative aspect-[9/16] overflow-hidden bg-gray-200 dark:bg-gray-800">
                  {template.videoUrl ? (
                    <OptimizedVideo
                      src={template.videoUrl}
                      poster={template.thumbnail_url || undefined}
                      onHoverPlay
                      className="w-full h-full"
                    />
                  ) : template.thumbnail_url ? (
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
                <div className="p-4 space-y-3">
                  <h3 className="font-semibold text-lg line-clamp-2">
                    {template.name}
                  </h3>
                  
                  {/* Author attribution */}
                  {template.author && (
                    <div className="flex items-center space-x-2">
                      <img
                        src={template.author.avatar}
                        alt={template.author.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {template.author.name}
                      </span>
                    </div>
                  )}
                </div>
              </GlassCard>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
};
