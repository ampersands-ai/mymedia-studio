import { CinematicNav } from "@/components/cinematic/CinematicNav";
import { CinematicHero } from "@/components/cinematic/CinematicHero";
import { YouTubePortfolio } from "@/components/cinematic/YouTubePortfolio";
import { AboutSection } from "@/components/cinematic/AboutSection";
import { ContactSection } from "@/components/cinematic/ContactSection";

const CinematicTest = () => {
  return (
    <div className="min-h-screen bg-black text-white scroll-smooth">
      {/* Navigation */}
      <CinematicNav />

      {/* Hero Section */}
      <CinematicHero />

      {/* Portfolio Section */}
      <YouTubePortfolio />

      {/* About Section */}
      <AboutSection />

      {/* Contact Section */}
      <ContactSection />
    </div>
  );
};

export default CinematicTest;
