import confetti, { type Options } from 'canvas-confetti';

export const useConfetti = () => {
  const fireConfetti = (options?: Options) => {
    const defaults: Options = {
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#F59E0B', '#9333EA', '#FBBF24', '#A855F7', '#FCD34D'],
    };

    confetti({
      ...defaults,
      ...options,
    });
  };

  const fireCelebration = (): (() => void) => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { 
      startVelocity: 30, 
      spread: 360, 
      ticks: 60, 
      zIndex: 9999,
      colors: ['#F59E0B', '#9333EA', '#FBBF24', '#A855F7', '#FCD34D']
    };

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      const particleCount = 50 * (timeLeft / duration);

      // Fire from left
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });

      // Fire from right
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);

    // Return cleanup function
    return () => clearInterval(interval);
  };

  return { fireConfetti, fireCelebration };
};
