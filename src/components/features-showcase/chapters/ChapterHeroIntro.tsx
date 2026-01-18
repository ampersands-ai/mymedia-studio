import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { FeatureChapter } from "../FeatureChapter";
import { ParticleField, FloatingLogos } from "../effects";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

export const ChapterHeroIntro = () => {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <FeatureChapter
      id="intro"
      background={
        <>
          <ParticleField />
          <FloatingLogos />
          <div className="absolute inset-0 bg-gradient-to-b from-black via-black/95 to-black" />
        </>
      }
    >
      <div className="text-center max-w-4xl mx-auto">
        <motion.span
          className="inline-block text-sm font-medium uppercase tracking-widest text-primary-orange mb-6"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Everything You Need to Create
        </motion.span>

        <motion.h1
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white uppercase tracking-tight mb-6"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <span className="bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">
            What Can You
          </span>
          <br />
          <span className="bg-gradient-to-r from-primary-orange via-primary to-primary-orange bg-clip-text text-transparent">
            Create?
          </span>
        </motion.h1>

        <motion.p
          className="text-xl md:text-2xl text-muted-foreground mb-12"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Video. Image. Audio. Voice. All from one platform.
        </motion.p>

        {/* Scroll indicator */}
        <motion.div
          className="flex flex-col items-center gap-2"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <span className="text-sm text-muted-foreground">Scroll to explore</span>
          <motion.div
            animate={
              prefersReducedMotion
                ? {}
                : {
                    y: [0, 8, 0],
                  }
            }
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <ChevronDown className="w-6 h-6 text-primary-orange" />
          </motion.div>
        </motion.div>
      </div>
    </FeatureChapter>
  );
};
