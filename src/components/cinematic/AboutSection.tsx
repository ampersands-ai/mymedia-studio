import { AnimatedSection } from "./AnimatedSection";

const stats = [
  { value: "10,000+", label: "Creators" },
  { value: "500,000+", label: "Generations" },
  { value: "30+", label: "AI Models" },
  { value: "120+", label: "Countries" },
];

export const AboutSection = () => {
  return (
    <section id="about" className="py-24 md:py-32 bg-zinc-950 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left - Text */}
          <AnimatedSection>
            <div>
              <span className="text-sm font-medium uppercase tracking-widest text-primary-orange mb-4 block">
                About Us
              </span>
              <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tight mb-8">
                Why Pay Them
                <br />
                When You Can Pay Less?
              </h2>
              <p className="text-lg text-white/60 mb-6 leading-relaxed">
                Artifio brings together the world's most powerful AI models in one seamless platform. 
                Generate stunning videos, images, and audio content without switching between tools.
              </p>
              <p className="text-lg text-white/60 leading-relaxed">
                From Sora and Kling to Midjourney and beyond — access 30+ cutting-edge AI models 
                with a single subscription. No API keys. No complexity. Just create.
              </p>
            </div>
          </AnimatedSection>

          {/* Right - Stats */}
          <AnimatedSection delay={200}>
            <div className="grid grid-cols-2 gap-4 sm:gap-8">
              {stats.map((stat) => (
                <div 
                  key={stat.label} 
                  className="border-l-2 border-primary-orange pl-3 sm:pl-6"
                >
                  <div className="text-2xl sm:text-4xl md:text-5xl font-black text-white mb-2 whitespace-nowrap">
                    {stat.value}
                  </div>
                  <div className="text-xs sm:text-sm uppercase tracking-widest text-white/50">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
};
