import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, FreeMode } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/free-mode';

// Import partner logos here
// Example: import yourLogo from '@/assets/partners/yourlogo.png';

const partners: { name: string; logo: string }[] = [
  // Add your partner logos here
  // Example: { name: 'Partner Name', logo: yourLogo },
];

export const PartnerLogosCarousel = () => {
  return (
    <div className="w-full space-y-4">
      {/* Label */}
      <p className="text-sm text-white/70 text-center md:text-left font-medium tracking-wide">
        Powered by 30+ leading AI providers
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
