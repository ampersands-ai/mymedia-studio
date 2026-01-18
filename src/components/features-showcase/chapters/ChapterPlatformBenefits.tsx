import { motion } from "framer-motion";
import { FeatureChapter } from "../FeatureChapter";
import { platformBenefits } from "@/data/features-showcase";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

export const ChapterPlatformBenefits = () => {
  const { ref, inView } = useScrollReveal({ threshold: 0.1 });
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <FeatureChapter
      id="platform"
      title="One Platform. Zero Complexity."
      background={
        <div className="absolute inset-0">
          {/* Subtle parallax dashboard mockup effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-black via-secondary/5 to-black" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary-orange/5 via-transparent to-transparent" />
        </div>
      }
    >
      <div ref={ref} className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {platformBenefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <motion.div
                key={benefit.id}
                className="group p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-primary-orange/30 transition-all duration-300"
                initial={prefersReducedMotion ? false : { opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={prefersReducedMotion ? {} : { y: -5 }}
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-orange/20 to-secondary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Icon className="w-6 h-6 text-primary-orange" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </FeatureChapter>
  );
};
