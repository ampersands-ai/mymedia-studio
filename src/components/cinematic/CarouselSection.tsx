import { AnimatedSection } from "./AnimatedSection";
import { PartnerLogosCarousel } from "@/components/homepage/PartnerLogosCarousel";

export const CarouselSection = () => {
  return (
    <section className="py-16 md:py-20 bg-zinc-950 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <AnimatedSection>
          <PartnerLogosCarousel />
        </AnimatedSection>
      </div>
    </section>
  );
};
