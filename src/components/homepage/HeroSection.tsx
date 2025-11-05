import { ArrowRight, Play, Sparkles } from 'lucide-react';
import { GradientButton } from '@/components/ui/gradient-button';
import { AnimatedBadge } from '@/components/ui/animated-badge';
import { GlassCard } from '@/components/ui/glass-card';
import { OptimizedVideo } from '@/components/ui/optimized-video';
import { Link } from 'react-router-dom';
import { useScrollY } from '@/hooks/useScrollY';
import { useIsMobile } from '@/hooks/use-mobile';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade } from 'swiper/modules';
import { useState } from 'react';
import 'swiper/css';
import 'swiper/css/effect-fade';

export const HeroSection = () => {
  const scrollY = useScrollY();
  const isMobile = useIsMobile();
  const [swiperInstance, setSwiperInstance] = useState<any>(null);
  
  // Disable parallax on mobile for better performance
  const parallaxY = isMobile ? 0 : scrollY;

  return (
    <section className="relative min-h-[70vh] md:min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900">
        {/* Animated orbs */}
        <div className="gradient-blob blob-1" />
        <div className="gradient-blob blob-2" />
        <div className="gradient-blob blob-3" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 md:pt-32 pb-12 md:pb-20">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left content */}
          <div className="space-y-4 md:space-y-8 flex flex-col items-center lg:items-start">
            {/* Badge */}
            <AnimatedBadge icon={Sparkles}>
              Trusted by 10,000+ creators
            </AnimatedBadge>

            {/* Main headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-7xl font-bold leading-tight text-center lg:text-left">
              Create Professional{' '}
              <span className="bg-gradient-to-r from-primary-yellow via-primary-orange to-accent-purple bg-clip-text text-transparent animate-gradient">
                AI Content
              </span>{' '}
              in Seconds
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-gray-800 dark:text-gray-200 max-w-xl text-center lg:text-left">
              30+ AI models for video, image, and audio generation. 
              One platform, unlimited creativity. No design skills needed.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link to="/create">
                <GradientButton size="lg" className="group w-full sm:w-auto">
                  Start Creating Free
                  <ArrowRight className="inline ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </GradientButton>
              </Link>
              
              <button className="px-8 py-4 rounded-full border-2 border-gray-300 dark:border-gray-600 hover:border-primary-orange dark:hover:border-primary-yellow transition-all duration-300 flex items-center justify-center space-x-2 hover:scale-105 text-foreground">
                <Play className="w-5 h-5" />
                <span className="font-semibold">Watch Demo</span>
              </button>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-4 md:gap-8 pt-2 justify-center lg:justify-start">
              <div>
                <div className="text-3xl font-bold bg-gradient-to-r from-primary-yellow to-primary-orange bg-clip-text text-transparent">
                  1M+
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  Generations Created
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold bg-gradient-to-r from-primary-yellow to-primary-orange bg-clip-text text-transparent">
                  30+
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  AI Models
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold bg-gradient-to-r from-primary-yellow to-primary-orange bg-clip-text text-transparent">
                  $79
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  Saved per Month
                </div>
              </div>
            </div>
          </div>

          {/* Right content - Video showcase */}
          <div className="relative mx-auto lg:mx-0 w-full max-w-md lg:max-w-none">
            <GlassCard gradient className="p-2">
              <div className="rounded-lg overflow-hidden w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-none aspect-video bg-gray-200 dark:bg-gray-800">
                <Swiper
                  modules={[Autoplay, EffectFade]}
                  onSwiper={setSwiperInstance}
                  onSlideChange={(swiper) => {
                    const activeSlide = swiper.slides[swiper.activeIndex];
                    const video = activeSlide?.querySelector('video');
                    
                    // Preload next video
                    const nextIndex = (swiper.activeIndex + 1) % swiper.slides.length;
                    const nextVideo = swiper.slides[nextIndex]?.querySelector('video');
                    if (nextVideo && !nextVideo.src) {
                      const dataSrc = nextVideo.getAttribute('data-src');
                      if (dataSrc) {
                        nextVideo.src = dataSrc;
                        nextVideo.load();
                      }
                    }
                    
                    if (video?.paused) {
                      video.play().catch(err => console.warn('Video play failed:', err));
                    }
                  }}
                  autoplay={{
                    delay: 8000,
                    disableOnInteraction: false,
                    waitForTransition: true,
                  }}
                  effect="fade"
                  fadeEffect={{
                    crossFade: true
                  }}
                  loop={true}
                  speed={800}
                  className="w-full h-full"
                >
                  <SwiperSlide>
                    <div className="relative w-full h-full">
                      <OptimizedVideo
                        src="/hero-demo.mp4"
                        autoPlay={true}
                        loop={true}
                        muted={true}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-4 right-4 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg">
                        <span className="text-sm font-semibold text-white">
                          made on artifio.ai
                        </span>
                      </div>
                    </div>
                  </SwiperSlide>
                  <SwiperSlide>
                    <div className="relative w-full h-full swiper-lazy">
                      <video
                        data-src="/hero-demo-2.mp4"
                        muted
                        playsInline
                        preload="metadata"
                        loop
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-4 right-4 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg">
                        <span className="text-sm font-semibold text-white">
                          made on artifio.ai
                        </span>
                      </div>
                    </div>
                  </SwiperSlide>
                  <SwiperSlide>
                    <div className="relative w-full h-full swiper-lazy">
                      <video
                        data-src="/hero-demo-3.mp4"
                        muted
                        playsInline
                        preload="metadata"
                        loop
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-4 right-4 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg">
                        <span className="text-sm font-semibold text-white">
                          made on artifio.ai
                        </span>
                      </div>
                    </div>
                  </SwiperSlide>
                  <SwiperSlide>
                    <div className="relative w-full h-full swiper-lazy">
                      <video
                        data-src="/hero-demo-4.mp4"
                        muted
                        playsInline
                        preload="metadata"
                        loop
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-4 right-4 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg">
                        <span className="text-sm font-semibold text-white">
                          made on artifio.ai
                        </span>
                      </div>
                    </div>
                  </SwiperSlide>
                  <SwiperSlide>
                    <div className="relative w-full h-full swiper-lazy">
                      <video
                        data-src="/hero-demo-5.mp4"
                        muted
                        playsInline
                        preload="metadata"
                        loop
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-4 right-4 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg">
                        <span className="text-sm font-semibold text-white">
                          made on artifio.ai
                        </span>
                      </div>
                    </div>
                  </SwiperSlide>
                  <SwiperSlide>
                    <div className="relative w-full h-full swiper-lazy">
                      <video
                        data-src="/hero-demo-6.mp4"
                        muted
                        playsInline
                        preload="metadata"
                        loop
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-4 right-4 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg">
                        <span className="text-sm font-semibold text-white">
                          made on artifio.ai
                        </span>
                      </div>
                    </div>
                  </SwiperSlide>
                </Swiper>
              </div>
            </GlassCard>

          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-gray-400 dark:border-gray-600 flex items-start justify-center p-2">
          <div className="w-1 h-3 bg-gray-400 dark:bg-gray-600 rounded-full animate-scroll" />
        </div>
      </div>
    </section>
  );
};
