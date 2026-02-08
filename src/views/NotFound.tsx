import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Home, Sparkles, Search, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const excuses = [
  "Our AI tried to generate this page... and created a parallel universe instead",
  "Error 404: Our neural network is having an existential crisis",
  "The pixels for this page are still being trained",
  "This page went to get coffee and never came back",
  "Even GPT couldn't find what you're looking for",
  "Our AI model is buffering... since 1999",
  "The page you seek exists only in the latent space",
  "404: Page.exe has stopped working. Blame the transformer",
  "Our diffusion model diffused this page into the void",
  "This URL has been deprecated by the singularity",
];

const FloatingParticle = ({ delay, duration, x }: { delay: number; duration: number; x: number }) => (
  <motion.div
    className="absolute w-2 h-2 rounded-full bg-primary/20"
    initial={{ y: "100vh", x: `${x}vw`, opacity: 0 }}
    animate={{
      y: "-10vh",
      opacity: [0, 1, 1, 0],
    }}
    transition={{
      duration,
      delay,
      repeat: Infinity,
      ease: "linear",
    }}
  />
);

const GlitchText = ({ children }: { children: React.ReactNode }) => (
  <div className="relative">
    <span className="relative inline-block">
      <span className="absolute inset-0 text-accent-purple/50 animate-pulse" style={{ clipPath: 'inset(45% 0 40% 0)', transform: 'translate(-2px, 0)' }}>
        {children}
      </span>
      <span className="absolute inset-0 text-primary-orange/50 animate-pulse" style={{ clipPath: 'inset(20% 0 60% 0)', transform: 'translate(2px, 0)', animationDelay: '0.1s' }}>
        {children}
      </span>
      {children}
    </span>
  </div>
);

const NotFound = () => {
  const pathname = usePathname();
  const [currentExcuse, setCurrentExcuse] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);

  useEffect(() => {
    logger.warn("404 Error: User attempted to access non-existent route", {
      component: 'NotFound',
      pathname: pathname
    });
  }, [pathname]);

  const generateNewExcuse = () => {
    setIsSpinning(true);
    setTimeout(() => {
      setCurrentExcuse((prev) => (prev + 1) % excuses.length);
      setIsSpinning(false);
    }, 300);
  };

  const particles = Array.from({ length: 15 }, (_, i) => ({
    id: i,
    delay: Math.random() * 5,
    duration: 8 + Math.random() * 4,
    x: Math.random() * 100,
  }));

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-b from-background via-background to-muted/50 overflow-hidden">
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((particle) => (
          <FloatingParticle key={particle.id} {...particle} />
        ))}
      </div>

      {/* Glowing orb background */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent-purple/5 rounded-full blur-3xl" />

      <div className="relative z-10 text-center px-4 max-w-2xl mx-auto">
        {/* Animated 404 */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mb-8"
        >
          <GlitchText>
            <h1 className="text-[120px] sm:text-[180px] font-bold leading-none tracking-tighter bg-gradient-to-br from-foreground via-foreground/80 to-foreground/60 bg-clip-text text-transparent">
              404
            </h1>
          </GlitchText>
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-xl sm:text-2xl text-muted-foreground mb-8"
        >
          Oops! This page got lost in the AI void
        </motion.p>

        {/* Excuse card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="relative mb-10 p-6 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm"
        >
          <div className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
            <span className="text-xs font-medium text-primary">💡 AI Excuse Generator</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.p
              key={currentExcuse}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="text-lg text-foreground/80 italic"
            >
              "{excuses[currentExcuse]}"
            </motion.p>
          </AnimatePresence>
        </motion.div>

        {/* Navigation buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="flex flex-wrap justify-center gap-4 mb-8"
        >
          <Button asChild variant="default" size="lg" className="gap-2">
            <Link href="/">
              <Home className="w-4 h-4" />
              Go Home
            </Link>
          </Button>
          <Button asChild variant="secondary" size="lg" className="gap-2">
            <Link href="/dashboard/custom-creation">
              <Sparkles className="w-4 h-4" />
              Start Creating
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="gap-2">
            <Link href="/models">
              <Search className="w-4 h-4" />
              Browse Models
            </Link>
          </Button>
        </motion.div>

        {/* Generate new excuse button */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={generateNewExcuse}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`w-4 h-4 transition-transform ${isSpinning ? 'animate-spin' : ''}`} />
            Generate Another Excuse
          </Button>
        </motion.div>

        {/* Attempted path (subtle) */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-8 text-xs text-muted-foreground/50 font-mono"
        >
          Attempted: {pathname}
        </motion.p>
      </div>
    </div>
  );
};

export default NotFound;
