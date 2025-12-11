import { AnimatedSection } from "./AnimatedSection";

const stats = [
  { value: "150+", label: "Projects Completed" },
  { value: "50+", label: "Happy Clients" },
  { value: "10+", label: "Years Experience" },
  { value: "25+", label: "Awards Won" },
];

export const AboutSection = () => {
  return (
    <section id="about" className="py-24 md:py-32 bg-neutral-950">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left - Text Content */}
          <AnimatedSection direction="left">
            <p className="text-sm text-white/60 uppercase tracking-widest mb-4">
              About Us
            </p>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              We Create
              <br />
              <span className="text-white/40">Visual Stories</span>
            </h2>
            <p className="text-lg text-white/70 leading-relaxed mb-8">
              We are a creative studio specializing in AI-powered content generation.
              From stunning visuals to immersive video experiences, we push the
              boundaries of what's possible with cutting-edge technology.
            </p>
            <p className="text-lg text-white/70 leading-relaxed">
              Our team combines artistic vision with technical expertise to deliver
              content that captivates audiences and drives results.
            </p>
          </AnimatedSection>

          {/* Right - Stats */}
          <AnimatedSection direction="right" delay={200}>
            <div className="grid grid-cols-2 gap-8">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="p-6 border border-white/10 rounded-lg hover:border-white/20 transition-colors"
                >
                  <p className="text-4xl md:text-5xl font-bold text-white mb-2">
                    {stat.value}
                  </p>
                  <p className="text-sm text-white/60">{stat.label}</p>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
};
