import { useState, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface InteractiveButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

interface Ripple {
  x: number;
  y: number;
  id: number;
}

export function InteractiveButton({ children, className, onClick, ...props }: InteractiveButtonProps) {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newRipple: Ripple = {
      x,
      y,
      id: Date.now()
    };

    setRipples([...ripples, newRipple]);

    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id));
    }, 600);

    onClick?.(e);
  };

  return (
    <button 
      className={cn("relative overflow-hidden", className)} 
      onClick={handleClick}
      {...props}
    >
      {children}
      <span className="absolute inset-0 pointer-events-none">
        {ripples.map(ripple => (
          <span
            key={ripple.id}
            className="absolute w-5 h-5 rounded-full bg-white/60 animate-ripple"
            style={{
              left: ripple.x,
              top: ripple.y,
              transform: 'translate(-50%, -50%)'
            }}
          />
        ))}
      </span>
    </button>
  );
}
