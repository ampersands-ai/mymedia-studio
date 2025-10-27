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
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900">
        {/* Animated orbs */}
        <div className="gradient-blob blob-1" />
        <div className="gradient-blob blob-2" />
        <div className="gradient-blob blob-3" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <div className="space-y-8">
            {/* Badge */}
            <AnimatedBadge icon={Sparkles}>
              Trusted by 10,000+ creators
            </AnimatedBadge>

            {/* Main headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight">
              Create Professional{' '}
              <span className="bg-gradient-to-r from-primary-yellow via-primary-orange to-accent-purple bg-clip-text text-transparent animate-gradient">
                AI Content
              </span>{' '}
              in Seconds
            </h1>

            {/* Subheadline */}
            <p className="text-xl text-gray-800 dark:text-gray-200 max-w-xl">
              30+ AI models for video, image, and audio generation. 
              One platform, unlimited creativity. No design skills needed.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4">
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
            <div className="flex flex-wrap gap-8 pt-4">
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
          <div className="relative">
            <GlassCard gradient className="p-2">
              <div className="rounded-lg overflow-hidden aspect-video bg-gray-200 dark:bg-gray-800">
                <Swiper
                  modules={[Autoplay, EffectFade]}
                  onSwiper={setSwiperInstance}
                  onSlideChange={(swiper) => {
                    const activeSlide = swiper.slides[swiper.activeIndex];
                    const video = activeSlide?.querySelector('video');
                    if (video) {
                      video.currentTime = 0;
                      video.play().catch(err => console.warn('Video play failed:', err));
                    }
                  }}
                  autoplay={{
                    delay: 6000,
                    disableOnInteraction: false,
                  }}
                  effect="fade"
                  fadeEffect={{
                    crossFade: true
                  }}
                  loop={true}
                  speed={500}
                  className="w-full h-full"
                >
                  <SwiperSlide>
                    <video
                      src="/hero-demo.mp4"
                      muted
                      playsInline
                      preload="auto"
                      className="w-full h-full object-cover"
                    />
                  </SwiperSlide>
                  <SwiperSlide>
                    <video
                      src="/hero-demo-2.mp4"
                      muted
                      playsInline
                      preload="auto"
                      className="w-full h-full object-cover"
                    />
                  </SwiperSlide>
                  <SwiperSlide>
                    <video
                      src="/hero-demo-3.mp4"
                      muted
                      playsInline
                      preload="auto"
                      className="w-full h-full object-cover"
                    />
                  </SwiperSlide>
                </Swiper>
              </div>
            </GlassCard>

            {/* Floating badges with parallax */}
            <div 
              className="absolute top-1/4 transform -translate-y-1/2 hidden lg:block left-[-5%] xl:left-[-2%]"
              style={{ transform: `translateY(${parallaxY * 0.1}px)` }}
            >
              <GlassCard className="p-4 animate-float">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-bold">
                    ✓
                  </div>
                  <div>
                    <div className="text-sm font-semibold">18 seconds</div>
                    <div className="text-xs text-gray-700 dark:text-gray-300">Generation time</div>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Cost savings badge */}
            <div 
              className="absolute top-1/3 hidden lg:block animate-float right-[-6%] xl:right-[-3%]" 
              style={{ 
                animationDelay: '1s',
                transform: `translateY(${parallaxY * 0.15}px)` 
              }}
            >
              <GlassCard className="p-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-sm font-bold">
                    $
                  </div>
                  <div>
                    <div className="font-bold text-sm">$79</div>
                    <div className="text-xs text-gray-700 dark:text-gray-300">Saved/month</div>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* User count badge */}
            <div 
              className="absolute bottom-1/4 hidden lg:block animate-float left-[-4%] xl:left-[-1%]" 
              style={{ 
                animationDelay: '0.5s',
                transform: `translateY(${parallaxY * 0.2}px)` 
              }}
            >
              <GlassCard className="p-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-yellow to-primary-orange flex items-center justify-center text-white text-sm font-bold">
                    👥
                  </div>
                  <div>
                    <div className="font-bold text-sm">10K+</div>
                    <div className="text-xs text-gray-700 dark:text-gray-300">Users</div>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Success rate badge */}
            <div 
              className="absolute bottom-1/3 hidden lg:block animate-float right-[-3%] xl:right-[-1%]" 
              style={{ 
                animationDelay: '1.5s',
                transform: `translateY(${parallaxY * 0.08}px)` 
              }}
            >
              <GlassCard className="p-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                    ⭐
                  </div>
                  <div>
                    <div className="font-bold text-sm">99.9%</div>
                    <div className="text-xs text-gray-700 dark:text-gray-300">Success rate</div>
                  </div>
                </div>
              </GlassCard>
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
