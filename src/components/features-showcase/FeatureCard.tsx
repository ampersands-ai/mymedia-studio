import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

interface FeatureCardProps {
  name: string;
  provider?: string;
  description?: string;
  icon?: LucideIcon;
  features?: string[];
  delay?: number;
  isHero?: boolean;
  inView?: boolean;
}

export const FeatureCard = ({
  name,
  provider,
  description,
  icon: Icon,
  features,
  delay = 0,
  isHero = false,
  inView = true,
}: FeatureCardProps) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <motion.div
      className={`group relative p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 
        hover:border-primary-orange/50 hover:bg-white/10 transition-all duration-300
        ${isHero ? "md:col-span-2 lg:col-span-3" : ""}`}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 30 }}
      animate={
        inView
          ? { opacity: 1, y: 0 }
          : prefersReducedMotion
          ? { opacity: 1, y: 0 }
          : { opacity: 0, y: 30 }
      }
      transition={{ duration: 0.5, delay: delay * 0.1 }}
      style={{
        boxShadow: "0 0 0 rgba(251, 146, 60, 0)",
      }}
      whileHover={
        prefersReducedMotion
          ? {}
          : {
              y: -5,
              boxShadow: "0 0 30px rgba(251, 146, 60, 0.2)",
            }
      }
    >
      {/* Icon */}
      {Icon && (
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-orange/20 to-secondary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
          <Icon className="w-6 h-6 text-primary-orange" />
        </div>
      )}

      {/* Content */}
      <div className="space-y-2">
        <h3 className="text-lg md:text-xl font-bold text-white">{name}</h3>
        {provider && (
          <p className="text-sm text-primary-orange/80 font-medium">{provider}</p>
        )}
        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* Features list */}
      {features && features.length > 0 && (
        <ul className="mt-4 space-y-2">
          {features.map((feature, i) => (
            <li
              key={i}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary-orange/60" />
              {feature}
            </li>
          ))}
        </ul>
      )}

      {/* Subtle glow effect on hover */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-br from-primary-orange/5 to-transparent" />
    </motion.div>
  );
};
