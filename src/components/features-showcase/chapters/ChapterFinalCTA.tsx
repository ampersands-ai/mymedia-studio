import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeatureChapter } from "../FeatureChapter";
import { ParticleField } from "../effects";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

export const ChapterFinalCTA = () => {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <FeatureChapter
      id="cta"
      background={
        <>
          <ParticleField />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/95 to-black" />
        </>
      }
    >
      <div className="text-center max-w-3xl mx-auto">
        <motion.h2
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white uppercase tracking-tight mb-6"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          Ready to Create
          <br />
          <span className="bg-gradient-to-r from-primary-orange via-primary to-primary-orange bg-clip-text text-transparent">
            Something Amazing?
          </span>
        </motion.h2>

        <motion.p
          className="text-lg md:text-xl text-muted-foreground mb-10 max-w-xl mx-auto"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Join thousands of creators making videos, images, and audio with AI.
        </motion.p>

        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Button
            asChild
            size="lg"
            className="group relative overflow-hidden bg-gradient-to-r from-primary-orange to-primary hover:from-primary hover:to-primary-orange text-black font-bold px-8 py-6 text-lg rounded-full transition-all duration-300"
          >
            <Link href="/auth" className="flex items-center gap-2">
              Start Creating Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              {/* Pulsing glow effect */}
              <span
                className="absolute inset-0 rounded-full"
                style={{
                  animation: prefersReducedMotion
                    ? "none"
                    : "cta-pulse 2s ease-in-out infinite",
                }}
              />
            </Link>
          </Button>
        </motion.div>

        <motion.p
          className="text-sm text-muted-foreground mt-6"
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          5 free credits • No credit card required
        </motion.p>
      </div>

      <style>{`
        @keyframes cta-pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(251, 146, 60, 0.4);
          }
          50% {
            box-shadow: 0 0 0 12px rgba(251, 146, 60, 0);
          }
        }
      `}</style>
    </FeatureChapter>
  );
};
