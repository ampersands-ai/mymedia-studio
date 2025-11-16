import { ArrowRight } from 'lucide-react';
import { GradientButton } from '@/components/ui/gradient-button';
import { Link, useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-fade';
import { PartnerLogosCarousel } from './PartnerLogosCarousel';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { CreationGroup } from '@/constants/creation-groups';

export const HeroSection = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  // AI Model badges with their details
  const aiModels = [
    {
      name: 'Veo 3.1',
      description: 'Google\'s advanced video generation model',
      group: 'prompt_to_video' as CreationGroup,
      delay: '0ms'
    },
    {
      name: 'Sora 2',
      description: 'OpenAI\'s cutting-edge video creation',
      group: 'prompt_to_video' as CreationGroup,
      delay: '100ms'
    },
    {
      name: 'Wan 2.5',
      description: 'Next-gen video synthesis technology',
      group: 'prompt_to_video' as CreationGroup,
      delay: '200ms'
    },
    {
      name: 'xAI Imagine',
      description: 'Advanced image generation from xAI',
      group: 'prompt_to_image' as CreationGroup,
      delay: '300ms'
    }
  ];

  const handleModelClick = (group: CreationGroup) => {
    localStorage.setItem('customCreation_selectedGroup', group);
    navigate('/custom-creation');
  };

  // Define video sources
  const desktopVideos = [
    '/hero-1.mp4',
    '/hero-2.mp4',
    '/hero-3.mp4',
    '/hero-4.mp4',
    '/hero-5.mp4',
    '/hero-6.mp4',
    '/hero-7.mp4',
  ];

  const mobileVideos = [
    '/hero-1-mobile.mp4',
    '/hero-2-mobile.mp4',
    '/hero-3-mobile.mp4',
    '/hero-4-mobile.mp4',
    '/hero-5-mobile.mp4',
    '/hero-6-mobile.mp4',
    '/hero-7-mobile.mp4',
  ];

  // Select appropriate videos based on device
  const videos = isMobile ? mobileVideos : desktopVideos;

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Full-screen video background */}
      <div className="absolute inset-0">
        <Swiper
          modules={[Autoplay, EffectFade]}
          onSwiper={setSwiperInstance}
          onSlideChange={(swiper) => {
            // Pause all videos
            swiper.slides.forEach(slide => {
              const video = slide.querySelector('video');
              if (video) {
                video.pause();
              }
            });

            // Play and reset current video
            const activeSlide = swiper.slides[swiper.activeIndex];
            const activeVideo = activeSlide?.querySelector('video') as HTMLVideoElement;
            
            if (activeVideo) {
              activeVideo.currentTime = 0;
              activeVideo.play().catch(err => {
                logger.warn('Hero video autoplay failed', {
                  component: 'HeroSection',
                  error: err.message,
                  slideIndex: swiper.activeIndex,
                  operation: 'onSlideChange'
                });
              });
            }
          }}
          autoplay={{
            delay: 7000,
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
          {videos.map((videoSrc, index) => (
            <SwiperSlide key={index}>
              <video
                src={videoSrc}
                autoPlay
                muted
                playsInline
                className="w-full h-screen object-cover"
              />
            </SwiperSlide>
          ))}
        </Swiper>
        
        {/* Enhanced gradient vignette overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/70" />
        
        {/* Video credit label */}
        <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-20 px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-sm">
          <span className="text-xs sm:text-sm text-white/80 font-medium">made on artifio.ai</span>
        </div>
      </div>

      {/* Content overlay with backdrop blur */}
      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 pt-24 pb-20 flex items-center justify-center md:justify-start">
        <div className="space-y-6 md:space-y-8 flex flex-col w-full max-w-4xl backdrop-blur-sm bg-black/30 rounded-3xl p-4 sm:p-6 md:p-8">
          {/* AI Models */}
          <TooltipProvider>
            <div className="flex flex-wrap gap-2 sm:gap-3 justify-start">
              {aiModels.map((model) => (
                <Tooltip key={model.name}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleModelClick(model.group)}
                      className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs sm:text-sm font-medium transition-all duration-300 hover:bg-white/20 hover:scale-105 hover:border-white/40 cursor-pointer animate-fade-in"
                      style={{ 
                        animationDelay: model.delay
                      }}
                    >
                      {model.name}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent 
                    side="bottom" 
                    className="bg-black/90 backdrop-blur-md border-white/20 text-white"
                  >
                    <p className="text-sm">{model.description}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>

          {/* Main headline with enhanced text shadow */}
          <h1 className="text-3xl sm:text-5xl lg:text-7xl font-bold leading-tight drop-shadow-2xl">
            <span className="text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">Professional{' '}</span>
            <span className="bg-gradient-to-r from-primary-yellow via-primary-orange to-accent-purple bg-clip-text text-transparent animate-gradient drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
              AI Content
            </span>{' '}
            <span className="text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">in Seconds</span>
          </h1>

          {/* Subheadline with text shadow */}
          <p className="text-lg sm:text-xl md:text-2xl text-white/90 max-w-2xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
            30+ AI models for video, image, and audio generation. 
            One platform, unlimited creativity. No design skills needed.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Link to="/dashboard/create" className="w-full sm:w-auto">
              <GradientButton size="lg" className="group w-full">
                Start Creating Free
                <ArrowRight className="inline ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </GradientButton>
            </Link>
          </div>

          {/* Partner Logos Carousel */}
          <div className="mt-8">
            <PartnerLogosCarousel />
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
