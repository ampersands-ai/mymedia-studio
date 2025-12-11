import { CinematicNav } from "@/components/cinematic/CinematicNav";
import { CinematicHero } from "@/components/cinematic/CinematicHero";
import { YouTubePortfolio } from "@/components/cinematic/YouTubePortfolio";
import { AboutSection } from "@/components/cinematic/AboutSection";
import { ContactSection } from "@/components/cinematic/ContactSection";

// Using a sample cinematic video - replace with your own
const HERO_VIDEO = "https://cdn.coverr.co/videos/coverr-an-aerial-view-of-a-beach-3403/1080p.mp4";

const CinematicTest = () => {
  return (
    <div className="min-h-screen bg-black text-white scroll-smooth">
      {/* Navigation */}
      <CinematicNav />

      {/* Hero Section */}
      <CinematicHero
        videoSrc={HERO_VIDEO}
        title="Create Cinematic Content"
        subtitle="Transform your ideas into stunning visual experiences with AI-powered generation"
      />

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
