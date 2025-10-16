import { useEffect, useRef, useState } from "react";

interface StatCounterProps {
  end: number;
  duration?: number;
  suffix?: string;
  label: string;
}

export const StatCounter = ({ end, duration = 2000, suffix = "", label }: StatCounterProps) => {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    const startTime = Date.now();
    const endTime = startTime + duration;

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      setCount(Math.floor(easeOut * end));

      if (now < endTime) {
        requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    requestAnimationFrame(animate);
  }, [isVisible, end, duration]);

  return (
    <div ref={elementRef} className="text-center">
      <div className="text-4xl md:text-5xl font-black text-foreground">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-sm md:text-base text-muted-foreground mt-2 font-medium">
        {label}
      </div>
    </div>
  );
};
