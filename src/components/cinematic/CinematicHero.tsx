import { useState, useRef, useEffect } from "react";
import { ChevronDown, Volume2, VolumeX } from "lucide-react";
import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectFade, Autoplay } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import { useIsMobile } from "@/hooks/use-mobile";

import "swiper/css";
import "swiper/css/effect-fade";

const rotatingWords = ["Audios", "Videos", "Stories", "Images", "Shorts", "Anything"];

const heroVideosDesktop = [
  "/hero-1.mp4",
  "/hero-2.mp4",
  "/hero-3.mp4",
  "/hero-4.mp4",
  "/hero-5.mp4",
  "/hero-6.mp4",
  "/hero-7.mp4",
];

const heroVideosMobile = [
  "/hero-1-mobile.mp4",
  "/hero-2-mobile.mp4",
  "/hero-3-mobile.mp4",
  "/hero-4-mobile.mp4",
  "/hero-5-mobile.mp4",
  "/hero-6-mobile.mp4",
  "/hero-7-mobile.mp4",
];

const aiModels = [
  { name: "Veo 3.1", group: "prompt_to_video" },
  { name: "Sora 2", group: "prompt_to_video" },
  { name: "Wan 2.5", group: "prompt_to_video" },
  { name: "xAI Imagine", group: "prompt_to_image" },
];

export const CinematicHero = () => {
  const [isMuted, setIsMuted] = useState(true);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const swiperRef = useRef<SwiperType | null>(null);
  const isMobile = useIsMobile();
  
  const heroVideos = isMobile ? heroVideosMobile : heroVideosDesktop;

  // Dynamic interval: pause longer on "Anything" (last word)
  useEffect(() => {
    const isAnything = currentWordIndex === rotatingWords.length - 1;
    const delay = isAnything ? 3000 : 1500; // 3s pause on "Anything", 1.5s for others
    
    const timer = setTimeout(() => {
      setCurrentWordIndex((prev) => (prev + 1) % rotatingWords.length);
    }, delay);
    
    return () => clearTimeout(timer);
  }, [currentWordIndex]);

  const handleSlideChange = (swiper: SwiperType) => {
    const newIndex = swiper.realIndex;

    // Pause all videos and play the active one
    videoRefs.current.forEach((video, index) => {
      if (video) {
        if (index === newIndex) {
          video.currentTime = 0;
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      }
    });
  };

  useEffect(() => {
    // Start playing the first video
    const firstVideo = videoRefs.current[0];
    if (firstVideo) {
      firstVideo.play().catch(() => {});
    }
  }, []);

  const scrollToPortfolio = () => {
    const element = document.getElementById("portfolio");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section id="hero" className="relative h-screen w-full overflow-hidden">
      {/* Video Background with Swiper */}
      <Swiper
        modules={[EffectFade, Autoplay]}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        autoplay={{ delay: 7000, disableOnInteraction: false }}
        loop={true}
        speed={1000}
        onSwiper={(swiper) => (swiperRef.current = swiper)}
        onSlideChange={handleSlideChange}
        className="absolute inset-0 w-full h-full"
      >
        {heroVideos.map((src, index) => (
          <SwiperSlide key={src} className="w-full h-full">
            <video
              ref={(el) => (videoRefs.current[index] = el)}
              muted={isMuted}
              loop
              playsInline
              autoPlay={index === 0}
              preload={index < 3 ? "auto" : "metadata"}
              className="absolute inset-0 w-full h-full object-cover"
            >
              <source src={src} type="video/mp4" />
            </video>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Minimal Dark Overlay */}
      <div className="absolute inset-0 bg-black/40 z-10" />

      {/* Bottom Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10" />

      {/* Bottom Left Content */}
      <div className="absolute bottom-32 md:bottom-24 left-4 right-4 md:left-16 md:right-auto z-20 max-w-3xl">
        {/* AI Model Pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          {aiModels.map((model) => (
            <span
              key={model.name}
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs sm:text-sm font-medium hover:bg-white/20 hover:scale-105 transition-all cursor-default"
            >
              {model.name}
            </span>
          ))}
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black text-white uppercase tracking-tight leading-none mb-4">
          Create{" "}
          <span 
            key={currentWordIndex} 
            className="inline-block animate-fade-in px-3 py-1 bg-white/10 backdrop-blur-md rounded-lg border border-white/20 text-glow animate-shimmer"
            style={{
              textShadow: '0 0 20px rgba(255, 255, 255, 0.5), 0 0 40px rgba(255, 200, 100, 0.3)',
            }}
          >
            {rotatingWords[currentWordIndex]}
          </span>.
          <br />
          <span className="text-white/90">Instantly. Without overpaying.</span>
        </h1>
        <p className="text-lg md:text-xl text-white/70 mb-8 max-w-xl">
          World&apos;s most powerful models. Disruptive Pricing.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <Link
            to="/auth"
            className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-primary-yellow to-primary-orange text-foreground font-bold uppercase tracking-wide hover:shadow-lg hover:shadow-primary-orange/30 transition-all hover:scale-105 text-center text-sm sm:text-base rounded-2xl"
          >
            Start Creating Free
          </Link>
          <button
            onClick={scrollToPortfolio}
            className="px-6 sm:px-8 py-3 sm:py-4 border border-white/30 text-white font-medium uppercase tracking-wide hover:bg-white/10 transition-colors text-sm sm:text-base rounded-2xl"
          >
            Use Cases
          </button>
        </div>
      </div>

      {/* Sound Toggle - Bottom Right */}
      <button
        onClick={() => setIsMuted(!isMuted)}
        className="absolute bottom-32 md:bottom-24 right-4 md:right-16 z-20 p-3 border border-white/30 text-white/60 hover:text-white hover:border-white/60 transition-colors rounded-2xl"
      >
        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </button>

      {/* Scroll Indicator */}
      <button
        onClick={scrollToPortfolio}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/40 hover:text-white transition-colors animate-bounce z-20"
      >
        <ChevronDown className="w-8 h-8" />
      </button>
    </section>
  );
};
