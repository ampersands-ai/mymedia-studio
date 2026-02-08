import { useEffect } from "react";
import { GlobalHeader } from "@/components/GlobalHeader";
import { Footer } from "@/components/Footer";
import { FeaturesShowcase } from "@/components/features-showcase";
import { pageTitle } from '@/config/brand';

const Features = () => {
  useEffect(() => {
    document.title = pageTitle('Features');
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Explore 30+ AI models for video, image, audio generation. All-in-one AI platform with transparent pricing.');
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-black">
      <GlobalHeader />
      
      <main className="flex-1">
        <FeaturesShowcase showHero={true} showCTA={true} />
      </main>

      <Footer />
    </div>
  );
};

export default Features;
