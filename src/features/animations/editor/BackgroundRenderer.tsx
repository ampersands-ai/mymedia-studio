import React from 'react';
import { BackgroundInstruction } from './types';
import { cn } from '@/lib/utils';

interface BackgroundRendererProps {
  background: BackgroundInstruction;
  className?: string;
}

export const BackgroundRenderer: React.FC<BackgroundRendererProps> = ({
  background,
  className,
}) => {
  const getBackgroundStyle = (): React.CSSProperties => {
    switch (background.type) {
      case 'solid':
        return { backgroundColor: background.color1 || '#1a1a2e' };
      
      case 'gradient':
        return {
          background: `linear-gradient(${background.gradientAngle || 135}deg, ${background.color1 || '#1a1a2e'}, ${background.color2 || '#16213e'})`,
        };
      
      case 'image':
        return {
          backgroundImage: `url(${background.imageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        };
      
      default:
        return { backgroundColor: background.color1 || '#1a1a2e' };
    }
  };

  const renderAnimatedBackground = () => {
    switch (background.type) {
      case 'particles':
        return <ParticlesBackground color={background.color1} count={background.particleCount} />;
      case 'waves':
        return <WavesBackground color1={background.color1} color2={background.color2} />;
      case 'grid':
        return <GridBackground color={background.color1} />;
      case 'starfield':
        return <StarfieldBackground />;
      default:
        return null;
    }
  };

  const isAnimated = ['particles', 'waves', 'grid', 'starfield'].includes(background.type);

  return (
    <div
      className={cn('absolute inset-0 overflow-hidden', className)}
      style={!isAnimated ? getBackgroundStyle() : { backgroundColor: '#000' }}
    >
      {isAnimated && renderAnimatedBackground()}
    </div>
  );
};

// Particles Background
const ParticlesBackground: React.FC<{ color?: string; count?: number }> = ({ 
  color = '#ffffff', 
  count = 50 
}) => {
  const particles = React.useMemo(() => 
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      duration: Math.random() * 20 + 10,
      delay: Math.random() * 5,
    })),
    [count]
  );

  return (
    <div className="absolute inset-0">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full animate-pulse"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: color,
            opacity: 0.6,
            animation: `float ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-20px) translateX(10px); }
          50% { transform: translateY(-10px) translateX(-10px); }
          75% { transform: translateY(-30px) translateX(5px); }
        }
      `}</style>
    </div>
  );
};

// Waves Background
const WavesBackground: React.FC<{ color1?: string; color2?: string }> = ({ 
  color1 = '#1a1a2e', 
  color2 = '#16213e' 
}) => {
  return (
    <div className="absolute inset-0" style={{ background: color1 }}>
      <svg
        className="absolute bottom-0 w-full h-1/2"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
      >
        <path
          fill={color2}
          fillOpacity="0.5"
          className="animate-wave"
          d="M0,160L48,176C96,192,192,224,288,229.3C384,235,480,213,576,181.3C672,149,768,107,864,112C960,117,1056,171,1152,181.3C1248,192,1344,160,1392,144L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
        />
        <path
          fill={color2}
          fillOpacity="0.8"
          className="animate-wave-slow"
          d="M0,256L48,261.3C96,267,192,277,288,261.3C384,245,480,203,576,186.7C672,171,768,181,864,197.3C960,213,1056,235,1152,229.3C1248,224,1344,192,1392,176L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
        />
      </svg>
      <style>{`
        @keyframes wave {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(-25px); }
        }
        @keyframes wave-slow {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(25px); }
        }
        .animate-wave { animation: wave 8s ease-in-out infinite; }
        .animate-wave-slow { animation: wave-slow 10s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

// Grid Background
const GridBackground: React.FC<{ color?: string }> = ({ color = '#ffffff' }) => {
  return (
    <div 
      className="absolute inset-0"
      style={{
        backgroundColor: '#0a0a0a',
        backgroundImage: `
          linear-gradient(${color}10 1px, transparent 1px),
          linear-gradient(90deg, ${color}10 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
      }}
    >
      <div 
        className="absolute inset-0 animate-grid-flow"
        style={{
          backgroundImage: `
            linear-gradient(${color}20 1px, transparent 1px),
            linear-gradient(90deg, ${color}20 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      />
      <style>{`
        @keyframes grid-flow {
          0% { transform: translate(0, 0); }
          100% { transform: translate(80px, 80px); }
        }
        .animate-grid-flow { animation: grid-flow 4s linear infinite; }
      `}</style>
    </div>
  );
};

// Starfield Background
const StarfieldBackground: React.FC = () => {
  const stars = React.useMemo(() => 
    Array.from({ length: 100 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      duration: Math.random() * 3 + 1,
      delay: Math.random() * 2,
    })),
    []
  );

  return (
    <div className="absolute inset-0 bg-black">
      {stars.map(star => (
        <div
          key={star.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
            animation: `twinkle ${star.duration}s ease-in-out ${star.delay}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
};
