import { ReactNode } from "react";
import { motion } from "framer-motion";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

interface FeatureChapterProps {
  id: string;
  title?: string;
  subtitle?: string;
  background?: ReactNode;
  children: ReactNode;
  className?: string;
  fullHeight?: boolean;
}

export const FeatureChapter = ({
  id,
  title,
  subtitle,
  background,
  children,
  className = "",
  fullHeight = true,
}: FeatureChapterProps) => {
  const { ref, inView } = useScrollReveal({ threshold: 0.1 });
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <section
      id={`chapter-${id}`}
      ref={ref}
      className={`relative ${fullHeight ? "min-h-screen" : ""} flex flex-col justify-center overflow-hidden ${className}`}
    >
      {/* Background Effect */}
      {background && (
        <div className="absolute inset-0 z-0">{background}</div>
      )}

      {/* Content */}
      <motion.div
        className="relative z-10 container mx-auto px-4 py-16 md:py-24"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 40 }}
        animate={
          inView
            ? { opacity: 1, y: 0 }
            : prefersReducedMotion
            ? { opacity: 1, y: 0 }
            : { opacity: 0, y: 40 }
        }
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {/* Chapter Header */}
        {(title || subtitle) && (
          <div className="text-center mb-12 md:mb-16">
            {title && (
              <motion.h2
                className="text-3xl md:text-5xl lg:text-6xl font-black text-white uppercase tracking-tight mb-4"
                initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                {title}
              </motion.h2>
            )}
            {subtitle && (
              <motion.p
                className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
                initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                {subtitle}
              </motion.p>
            )}
          </div>
        )}

        {/* Chapter Content */}
        {children}
      </motion.div>
    </section>
  );
};
