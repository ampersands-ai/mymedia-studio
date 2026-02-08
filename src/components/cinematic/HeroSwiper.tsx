import { useRef, useEffect, MutableRefObject } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectFade, Autoplay } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";

import "swiper/css";
import "swiper/css/effect-fade";

interface HeroSwiperProps {
  heroVideos: string[];
  isMuted: boolean;
  videoRefs: MutableRefObject<(HTMLVideoElement | null)[]>;
}

const HeroSwiper = ({ heroVideos, isMuted, videoRefs }: HeroSwiperProps) => {
  const swiperRef = useRef<SwiperType | null>(null);

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
    // Start playing the first video with retry logic
    const firstVideo = videoRefs.current[0];
    if (firstVideo) {
      const attemptPlay = () => {
        firstVideo.play().catch(() => {
          setTimeout(() => firstVideo.play().catch(() => {}), 100);
        });
      };
      
      if (firstVideo.readyState >= 3) {
        attemptPlay();
      } else {
        firstVideo.addEventListener('canplay', attemptPlay, { once: true });
      }
    }
  }, [videoRefs]);

  // Update muted state on all videos when isMuted changes
  useEffect(() => {
    videoRefs.current.forEach((video) => {
      if (video) {
        video.muted = isMuted;
      }
    });
  }, [isMuted, videoRefs]);

  return (
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
            ref={(el) => { videoRefs.current[index] = el; }}
            src={src}
            muted={isMuted}
            loop
            playsInline
            autoPlay={index === 0}
            preload={index === 0 ? "auto" : index === 1 ? "metadata" : "none"}
            poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3Crect fill='%23111'/%3E%3C/svg%3E"
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src={src} type="video/mp4" />
          </video>
        </SwiperSlide>
      ))}
    </Swiper>
  );
};

export default HeroSwiper;
