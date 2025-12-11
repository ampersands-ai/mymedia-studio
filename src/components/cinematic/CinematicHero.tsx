import { ChevronDown, Play } from "lucide-react";
import { Link } from "react-router-dom";

interface CinematicHeroProps {
  videoSrc: string;
  title: string;
  subtitle?: string;
}

export const CinematicHero = ({ videoSrc, title, subtitle }: CinematicHeroProps) => {
  const scrollToPortfolio = () => {
    const element = document.getElementById("portfolio");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section id="hero" className="relative h-screen w-full overflow-hidden">
      {/* Video Background */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src={videoSrc} type="video/mp4" />
      </video>

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Gradient Overlay (bottom fade) */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30" />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white tracking-tight mb-6 animate-fade-in">
          {title}
        </h1>
        {subtitle && (
          <p className="text-lg md:text-xl text-white/80 max-w-2xl mb-12 animate-fade-in" style={{ animationDelay: "200ms" }}>
            {subtitle}
          </p>
        )}

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-4 animate-fade-in" style={{ animationDelay: "400ms" }}>
          <button
            onClick={scrollToPortfolio}
            className="group flex items-center gap-2 px-8 py-4 bg-white text-black font-medium rounded-full hover:bg-white/90 transition-all"
          >
            <Play className="w-5 h-5" />
            Watch Showreel
          </button>
          <Link
            to="/auth"
            className="px-8 py-4 border border-white/30 text-white font-medium rounded-full hover:bg-white/10 transition-all"
          >
            Start Creating
          </Link>
        </div>
      </div>

      {/* Scroll Indicator */}
      <button
        onClick={scrollToPortfolio}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/60 hover:text-white transition-colors animate-bounce"
      >
        <ChevronDown className="w-8 h-8" />
      </button>
    </section>
  );
};
