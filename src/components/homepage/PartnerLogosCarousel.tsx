import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, FreeMode } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/free-mode';

// Import partner logos
import metaLogo from '@/assets/partners/meta.jpeg';
import googleLogo from '@/assets/partners/google.png';
import runwayLogo from '@/assets/partners/runway.png';
import openaiLogo from '@/assets/partners/openai.png';
import recraftLogo from '@/assets/partners/recraft.png';
import perplexityLogo from '@/assets/partners/perplexity.png';
import anthropicLogo from '@/assets/partners/anthropic.png';
import ideogramLogo from '@/assets/partners/ideogram.png';
import grokLogo from '@/assets/partners/grok.png';
import midjourneyLogo from '@/assets/partners/midjourney.png';

const partners = [
  { name: 'Meta AI', logo: metaLogo },
  { name: 'Google', logo: googleLogo },
  { name: 'OpenAI', logo: openaiLogo },
  { name: 'Anthropic', logo: anthropicLogo },
  { name: 'Grok', logo: grokLogo },
  { name: 'Runway', logo: runwayLogo },
  { name: 'Midjourney', logo: midjourneyLogo },
  { name: 'Ideogram', logo: ideogramLogo },
  { name: 'Recraft', logo: recraftLogo },
  { name: 'Perplexity', logo: perplexityLogo },
];

export const PartnerLogosCarousel = () => {
  return (
    <div className="w-full space-y-4">
      {/* Label */}
      <p className="text-sm text-white/70 text-center md:text-left font-medium tracking-wide">
        Powered by 10+ leading AI providers
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
          speed={3000}
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
                  className="h-6 md:h-8 w-auto object-contain opacity-90 hover:opacity-100 hover:scale-110 transition-all duration-300 drop-shadow-[0_0_12px_rgba(253,176,34,0.3)] hover:drop-shadow-[0_0_20px_rgba(253,176,34,0.5)]"
                />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  );
};
