import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, FreeMode } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/free-mode';

// Import partner logos
import openaiLogo from '@/assets/partners/openai.png';
import geminiLogo from '@/assets/partners/gemini.png';
import googleLogo from '@/assets/partners/google.webp';
import googleAiLogo from '@/assets/partners/google-ai.png';
import chatgptLogo from '@/assets/partners/chatgpt.png';
import runwayLogo from '@/assets/partners/runway.png';
import midjourneyLogo from '@/assets/partners/midjourney.jpg';
import midjourneyAltLogo from '@/assets/partners/midjourney-alt.webp';
import elevenLabsLogo from '@/assets/partners/elevenlabs.png';
import ideogramLogo from '@/assets/partners/ideogram.png';
import recraftLogo from '@/assets/partners/recraft.png';
import klingLogo from '@/assets/partners/kling.png';
import hailuoLogo from '@/assets/partners/hailuo.png';
import lumaLogo from '@/assets/partners/luma.jpg';
import bytedanceLogo from '@/assets/partners/bytedance.png';
import seedanceLogo from '@/assets/partners/seedance.png';
import wanLogo from '@/assets/partners/wan.png';
import wanAlibabaLogo from '@/assets/partners/wan-alibaba.avif';
import topazLogo from '@/assets/partners/topaz.webp';
import soraLogo from '@/assets/partners/sora2.jpg';
import veoLogo from '@/assets/partners/veo3.png';
import sunoSvg from '@/assets/partners/suno.svg';
import claudeSvg from '@/assets/partners/claude.svg';
import blackforestSvg from '@/assets/partners/blackforest.svg';

const partners = [
  { name: 'OpenAI', logo: openaiLogo },
  { name: 'Google Gemini', logo: geminiLogo },
  { name: 'Claude AI', logo: claudeSvg },
  { name: 'ChatGPT', logo: chatgptLogo },
  { name: 'Google AI', logo: googleAiLogo },
  { name: 'Runway', logo: runwayLogo },
  { name: 'Midjourney', logo: midjourneyLogo },
  { name: 'ElevenLabs', logo: elevenLabsLogo },
  { name: 'Ideogram', logo: ideogramLogo },
  { name: 'Recraft', logo: recraftLogo },
  { name: 'Kling AI', logo: klingLogo },
  { name: 'Hailuo AI', logo: hailuoLogo },
  { name: 'Luma AI', logo: lumaLogo },
  { name: 'Suno AI', logo: sunoSvg },
  { name: 'Black Forest Labs', logo: blackforestSvg },
  { name: 'ByteDance', logo: bytedanceLogo },
  { name: 'Wan', logo: wanLogo },
  { name: 'Topaz Labs', logo: topazLogo },
  { name: 'Sora', logo: soraLogo },
  { name: 'Veo', logo: veoLogo },
];

export const PartnerLogosCarousel = () => {
  return (
    <div className="w-full space-y-4">
      {/* Label */}
      <p className="text-sm text-white/70 text-center md:text-left font-medium tracking-wide">
        Powered by 30+ leading AI providers
      </p>
      
      {/* Carousel containers */}
      <div className="space-y-4">
        {/* First carousel - scrolls right */}
        <div className="relative rounded-2xl backdrop-blur-sm bg-black/10 border border-white/10 py-4 overflow-hidden">
          {/* Left fade gradient */}
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-black/50 to-transparent z-10 pointer-events-none" />
          
          {/* Right fade gradient */}
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-black/50 to-transparent z-10 pointer-events-none" />
          
          <Swiper
            modules={[Autoplay, FreeMode]}
            slidesPerView="auto"
            spaceBetween={40}
            loop={true}
            speed={1500}
            autoplay={{
              delay: 0,
              disableOnInteraction: false,
            }}
            freeMode={true}
            allowTouchMove={false}
            className="partner-logos-swiper"
          >
            {/* Duplicate array 3 times for seamless loop */}
            {[...partners, ...partners, ...partners].map((partner, index) => (
              <SwiperSlide key={`row1-${partner.name}-${index}`} style={{ width: 'auto' }}>
                <div className="flex items-center justify-center px-4">
                  <img
                    src={partner.logo}
                    alt={`${partner.name} logo`}
                    className="h-6 md:h-8 w-auto object-contain opacity-90 hover:opacity-100 hover:scale-110 transition-all duration-300 drop-shadow-[0_0_12px_rgba(253,176,34,0.4)] hover:drop-shadow-[0_0_20px_rgba(251,146,60,0.6)]"
                  />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        {/* Second carousel - scrolls left (reverse) */}
        <div className="relative rounded-2xl backdrop-blur-sm bg-black/10 border border-white/10 py-4 overflow-hidden">
          {/* Left fade gradient */}
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-black/50 to-transparent z-10 pointer-events-none" />
          
          {/* Right fade gradient */}
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-black/50 to-transparent z-10 pointer-events-none" />
          
          <Swiper
            modules={[Autoplay, FreeMode]}
            slidesPerView="auto"
            spaceBetween={40}
            loop={true}
            speed={1500}
            autoplay={{
              delay: 0,
              disableOnInteraction: false,
              reverseDirection: true,
            }}
            freeMode={true}
            allowTouchMove={false}
            className="partner-logos-swiper"
          >
            {/* Duplicate array 3 times for seamless loop */}
            {[...partners, ...partners, ...partners].map((partner, index) => (
              <SwiperSlide key={`row2-${partner.name}-${index}`} style={{ width: 'auto' }}>
                <div className="flex items-center justify-center px-4">
                  <img
                    src={partner.logo}
                    alt={`${partner.name} logo`}
                    className="h-6 md:h-8 w-auto object-contain opacity-90 hover:opacity-100 hover:scale-110 transition-all duration-300 drop-shadow-[0_0_12px_rgba(131,89,255,0.4)] hover:drop-shadow-[0_0_20px_rgba(255,122,195,0.6)]"
                  />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </div>
  );
};
