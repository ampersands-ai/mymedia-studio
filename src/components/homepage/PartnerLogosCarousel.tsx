import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, FreeMode } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/free-mode';

// Import partner logos
import xai from '@/assets/partners/xai.jpg';
import midjourney from '@/assets/partners/midjourney.png';
import metaGradient from '@/assets/partners/meta-gradient.png';
import anthropic from '@/assets/partners/anthropic.png';
import perplexity from '@/assets/partners/perplexity.png';
import googleBars from '@/assets/partners/google-bars.png';
import sora from '@/assets/partners/sora.png';
import grok from '@/assets/partners/grok.png';
import suno from '@/assets/partners/suno.jpeg';
import plum from '@/assets/partners/plum.png';
import minimax from '@/assets/partners/minimax.png';
import brainAi from '@/assets/partners/brain-ai.png';
import geometric from '@/assets/partners/geometric.jpg';
import meta from '@/assets/partners/meta.jpeg';
import google from '@/assets/partners/google.png';

const partners: { name: string; logo: string }[] = [
  { name: 'xAI', logo: xai },
  { name: 'Midjourney', logo: midjourney },
  { name: 'Meta', logo: metaGradient },
  { name: 'Anthropic', logo: anthropic },
  { name: 'Perplexity', logo: perplexity },
  { name: 'Google', logo: googleBars },
  { name: 'Sora', logo: sora },
  { name: 'Grok', logo: grok },
  { name: 'Suno', logo: suno },
  { name: 'Plum AI', logo: plum },
  { name: 'Minimax', logo: minimax },
  { name: 'Brain AI', logo: brainAi },
  { name: 'Geometric AI', logo: geometric },
  { name: 'Meta AI', logo: meta },
  { name: 'Google AI', logo: google },
];

export const PartnerLogosCarousel = () => {
  return (
    <div className="w-full space-y-4">
      {/* Label */}
      <p className="text-sm text-white/70 text-center md:text-left font-medium tracking-wide">
        Powered by 15+ leading AI providers
      </p>
      
      {/* Carousel container */}
      <div className="relative rounded-2xl backdrop-blur-sm bg-black/10 border border-white/10 py-6 overflow-hidden">
        {/* Left fade gradient */}
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-black/50 to-transparent z-10 pointer-events-none" />
        
        {/* Right fade gradient */}
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-black/50 to-transparent z-10 pointer-events-none" />
        
        <Swiper
          modules={[Autoplay, FreeMode]}
          slidesPerView="auto"
          spaceBetween={40}
          loop={true}
          loopAdditionalSlides={partners.length}
          speed={2000}
          autoplay={{
            delay: 0,
            disableOnInteraction: false,
            pauseOnMouseEnter: false,
          }}
          freeMode={{
            enabled: true,
            momentum: false,
          }}
          allowTouchMove={false}
          className="partner-logos-swiper"
        >
          {/* Duplicate array 3 times for seamless loop */}
          {[...partners, ...partners, ...partners].map((partner, index) => (
            <SwiperSlide key={`${partner.name}-${index}`} style={{ width: 'auto' }}>
              <div className="flex items-center justify-center px-4">
                <img
                  src={partner.logo}
                  alt={`${partner.name} logo`}
                  className="h-12 md:h-14 w-auto object-contain bg-white p-3 rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.25)] hover:scale-110 transition-all duration-300"
                />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  );
};
