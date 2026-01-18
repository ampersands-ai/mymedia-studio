import { AnimatedSection } from "./AnimatedSection";
import { PartnerLogosCarousel } from "@/components/homepage/PartnerLogosCarousel";

export const CarouselSection = () => {
  return (
    <section id="carousel" className="py-16 md:py-20 bg-zinc-950 overflow-hidden w-full">
      <AnimatedSection>
        <PartnerLogosCarousel />
      </AnimatedSection>
    </section>
  );
};
