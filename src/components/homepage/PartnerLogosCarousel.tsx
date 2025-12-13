import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, FreeMode } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/free-mode';

const partners: { name: string; logo: string }[] = [
  { name: 'xAI', logo: '/logos/xai.png' },
  { name: 'Midjourney', logo: '/logos/midjourney.png' },
  { name: 'Anthropic', logo: '/logos/anthropic.png' },
  { name: 'Google', logo: '/logos/google.png' },
  { name: 'OpenAI', logo: '/logos/openai.png' },
  { name: 'Sora', logo: '/logos/sora.png' },
  { name: 'Grok', logo: '/logos/grok.png' },
  { name: 'Suno', logo: '/logos/suno.png' },
  { name: 'Plum AI', logo: '/logos/plum.png' },
  { name: 'Minimax', logo: '/logos/minimax.png' },
  { name: 'HiDream', logo: '/logos/hidream.png' },
  { name: 'Runway', logo: '/logos/runway.png' },
  { name: 'Kling', logo: '/logos/kling.png' },
  { name: 'Ideogram', logo: '/logos/ideogram.png' },
  { name: 'Flux', logo: '/logos/flux.png' },
  { name: 'ElevenLabs', logo: '/logos/elevenlabs.png' },
  { name: 'Wan', logo: '/logos/wan.png' },
];

export const PartnerLogosCarousel = () => {
  return (
    <div className="w-full space-y-4">
      {/* Label */}
      <p className="text-sm text-white/70 text-center md:text-left md:pl-4 font-medium tracking-wide">
        Powered by 17+ leading AI providers
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
            pauseOnMouseEnter: true,
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
                  onError={(e) => {
                    // Hide broken images
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  );
};
