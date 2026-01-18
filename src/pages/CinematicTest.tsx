import { CinematicNav } from "@/components/cinematic/CinematicNav";
import { CinematicHeroOptimized } from "@/components/cinematic/CinematicHeroOptimized";
import { AboutSection } from "@/components/cinematic/AboutSection";
import { CarouselSection } from "@/components/cinematic/CarouselSection";
import { ContactSection } from "@/components/cinematic/ContactSection";
import { FeaturesShowcase } from "@/components/features-showcase";

const CinematicTest = () => {
  return (
    <div className="min-h-screen bg-black text-white scroll-smooth">
      {/* Navigation */}
      <CinematicNav />

      {/* Hero Section - Optimized for faster loading */}
      <CinematicHeroOptimized />

      {/* Partner Logos Carousel */}
      <CarouselSection />

      {/* About Section */}
      <AboutSection />

      {/* Cinematic Features Showcase */}
      <FeaturesShowcase showHero={false} showCTA={true} />

      {/* Contact Section */}
      <ContactSection />
    </div>
  );
};

export default CinematicTest;
