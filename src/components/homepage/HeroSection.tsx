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
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Full-screen video background */}
      <div className="absolute inset-0">
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
            <video
              src="/hero-1.mp4"
              autoPlay
              muted
              playsInline
              loop
              className="w-full h-screen object-cover"
            />
          </SwiperSlide>
          <SwiperSlide>
            <video
              src="/hero-2.mp4"
              autoPlay
              muted
              playsInline
              loop
              className="w-full h-screen object-cover"
            />
          </SwiperSlide>
          <SwiperSlide>
            <video
              src="/hero-3.mp4"
              autoPlay
              muted
              playsInline
              loop
              className="w-full h-screen object-cover"
            />
          </SwiperSlide>
          <SwiperSlide>
            <video
              src="/hero-4.mp4"
              autoPlay
              muted
              playsInline
              loop
              className="w-full h-screen object-cover"
            />
          </SwiperSlide>
          <SwiperSlide>
            <video
              src="/hero-5.mp4"
              autoPlay
              muted
              playsInline
              loop
              className="w-full h-screen object-cover"
            />
          </SwiperSlide>
          <SwiperSlide>
            <video
              src="/hero-6.mp4"
              autoPlay
              muted
              playsInline
              loop
              className="w-full h-screen object-cover"
            />
          </SwiperSlide>
          <SwiperSlide>
            <video
              src="/hero-7.mp4"
              autoPlay
              muted
              playsInline
              loop
              className="w-full h-screen object-cover"
            />
          </SwiperSlide>
        </Swiper>
        
        {/* Enhanced gradient vignette overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/70" />
      </div>

      {/* Content overlay with backdrop blur */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20 text-left">
        <div className="space-y-8 flex flex-col max-w-4xl backdrop-blur-sm bg-black/20 rounded-3xl p-8">
          {/* Badge */}
          <AnimatedBadge icon={Sparkles}>
            Trusted by 10,000+ creators
          </AnimatedBadge>

          {/* Main headline with enhanced text shadow */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold leading-tight drop-shadow-2xl">
            <span className="text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">Professional{' '}</span>
            <span className="bg-gradient-to-r from-primary-yellow via-primary-orange to-accent-purple bg-clip-text text-transparent animate-gradient drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
              AI Content
            </span>{' '}
            <span className="text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">in Seconds</span>
          </h1>

          {/* Subheadline with text shadow */}
          <p className="text-xl md:text-2xl text-white/90 max-w-2xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
            30+ AI models for video, image, and audio generation. 
            One platform, unlimited creativity. No design skills needed.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-start">
            <Link to="/create">
              <GradientButton size="lg" className="group w-full sm:w-auto">
                Start Creating Free
                <ArrowRight className="inline ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </GradientButton>
            </Link>
            
            <button className="px-8 py-4 rounded-full border-2 border-white/30 hover:border-white/60 transition-all duration-300 flex items-center justify-center space-x-2 hover:scale-105 text-white backdrop-blur-sm bg-white/10">
              <Play className="w-5 h-5" />
              <span className="font-semibold">Watch Demo</span>
            </button>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-8 pt-4 justify-start">
            <div>
              <div className="text-3xl font-bold text-white">
                1M+
              </div>
              <div className="text-sm text-white/80">
                Generations Created
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">
                30+
              </div>
              <div className="text-sm text-white/80">
                AI Models
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">
                $79
              </div>
              <div className="text-sm text-white/80">
                Saved per Month
              </div>
            </div>
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
