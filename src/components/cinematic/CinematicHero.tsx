import { useState, useEffect } from "react";
import { ChevronDown, Volume2, VolumeX } from "lucide-react";
import { Link } from "react-router-dom";

const heroVideos = [
  "/videos/hero-1.mp4",
  "/videos/hero-2.mp4",
  "/videos/hero-3.mp4",
  "/videos/hero-4.mp4",
  "/videos/hero-5.mp4",
  "/videos/hero-6.mp4",
  "/videos/hero-7.mp4",
];

export const CinematicHero = () => {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentVideoIndex((prev) => (prev + 1) % heroVideos.length);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  const scrollToPortfolio = () => {
    const element = document.getElementById("portfolio");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section id="hero" className="relative h-screen w-full overflow-hidden">
      {/* Video Background with Crossfade */}
      {heroVideos.map((src, index) => (
        <video
          key={src}
          autoPlay
          muted={isMuted}
          loop
          playsInline
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
            index === currentVideoIndex ? "opacity-100" : "opacity-0"
          }`}
        >
          <source src={src} type="video/mp4" />
        </video>
      ))}

      {/* Minimal Dark Overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Bottom Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />

      {/* MOJJU-Style Bottom Left Content */}
      <div className="absolute bottom-24 left-8 md:left-16 z-10 max-w-3xl">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white uppercase tracking-tight leading-none mb-4">
          AI Content Creation
          <br />
          <span className="text-white/90">Without Limits</span>
        </h1>
        <p className="text-lg md:text-xl text-white/70 mb-8 max-w-xl">
          30+ AI models. One platform. Create stunning videos, images, and audio in seconds.
        </p>

        {/* CTAs */}
        <div className="flex items-center gap-4">
          <Link
            to="/auth"
            className="px-8 py-4 bg-red-600 text-white font-bold uppercase tracking-wide hover:bg-red-700 transition-colors"
          >
            Start Creating Free
          </Link>
          <button
            onClick={scrollToPortfolio}
            className="px-8 py-4 border border-white/30 text-white font-medium uppercase tracking-wide hover:bg-white/10 transition-colors"
          >
            View Work
          </button>
        </div>
      </div>

      {/* Sound Toggle - Bottom Right */}
      <button
        onClick={() => setIsMuted(!isMuted)}
        className="absolute bottom-24 right-8 md:right-16 z-10 p-3 border border-white/30 text-white/60 hover:text-white hover:border-white/60 transition-colors"
      >
        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </button>

      {/* Scroll Indicator */}
      <button
        onClick={scrollToPortfolio}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/40 hover:text-white transition-colors animate-bounce"
      >
        <ChevronDown className="w-8 h-8" />
      </button>
    </section>
  );
};
