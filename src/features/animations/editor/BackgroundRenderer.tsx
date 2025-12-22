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
    const speed = background.animationSpeed || 1;
    
    switch (background.type) {
      case 'particles':
        return (
          <ParticlesBackground 
            color={background.color1} 
            color2={background.color2}
            count={background.particleCount} 
            speed={speed}
          />
        );
      case 'waves':
        return (
          <WavesBackground 
            color1={background.color1} 
            color2={background.color2} 
            speed={speed}
          />
        );
      case 'grid':
        return (
          <GridBackground 
            color={background.color1} 
            color2={background.color2}
            speed={speed}
          />
        );
      case 'starfield':
        return (
          <StarfieldBackground 
            color={background.color1}
            speed={speed}
          />
        );
      default:
        return null;
    }
  };

  const isAnimated = ['particles', 'waves', 'grid', 'starfield'].includes(background.type);

  return (
    <div
      className={cn('absolute inset-0 overflow-hidden', className)}
      style={!isAnimated ? getBackgroundStyle() : { backgroundColor: background.color2 || '#000' }}
    >
      {isAnimated && renderAnimatedBackground()}
    </div>
  );
};

// Particles Background - Enhanced with floating and glowing particles
const ParticlesBackground: React.FC<{ 
  color?: string; 
  color2?: string;
  count?: number; 
  speed?: number 
}> = ({ 
  color = '#ffffff', 
  color2,
  count = 50,
  speed = 1
}) => {
  const particles = React.useMemo(() => 
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 6 + 2,
      duration: (Math.random() * 15 + 8) / speed,
      delay: Math.random() * 5,
      type: Math.random() > 0.7 ? 'glow' : 'normal',
      color: color2 && Math.random() > 0.5 ? color2 : color,
    })),
    [count, speed, color, color2]
  );

  return (
    <div className="absolute inset-0">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            opacity: p.type === 'glow' ? 0.9 : 0.6,
            boxShadow: p.type === 'glow' ? `0 0 ${p.size * 2}px ${p.color}` : 'none',
            animation: `particleFloat ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes particleFloat {
          0%, 100% { 
            transform: translateY(0) translateX(0) scale(1); 
            opacity: 0.6;
          }
          25% { 
            transform: translateY(-30px) translateX(15px) scale(1.1); 
            opacity: 0.8;
          }
          50% { 
            transform: translateY(-15px) translateX(-10px) scale(0.9); 
            opacity: 0.7;
          }
          75% { 
            transform: translateY(-45px) translateX(8px) scale(1.05); 
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
};

// Waves Background - Enhanced with multiple wave layers
const WavesBackground: React.FC<{ 
  color1?: string; 
  color2?: string;
  speed?: number;
}> = ({ 
  color1 = '#1a1a2e', 
  color2 = '#16213e',
  speed = 1 
}) => {
  const waveDuration = 8 / speed;
  const slowWaveDuration = 12 / speed;
  
  return (
    <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${color1} 0%, ${color2} 100%)` }}>
      <svg
        className="absolute bottom-0 w-full h-2/3"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
      >
        <path
          fill={color2}
          fillOpacity="0.3"
          style={{ animation: `wave ${waveDuration}s ease-in-out infinite` }}
          d="M0,96L48,112C96,128,192,160,288,186.7C384,213,480,235,576,218.7C672,203,768,149,864,138.7C960,128,1056,160,1152,170.7C1248,181,1344,171,1392,165.3L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
        />
        <path
          fill={color2}
          fillOpacity="0.5"
          style={{ animation: `waveReverse ${slowWaveDuration}s ease-in-out infinite` }}
          d="M0,160L48,176C96,192,192,224,288,229.3C384,235,480,213,576,181.3C672,149,768,107,864,112C960,117,1056,171,1152,181.3C1248,192,1344,160,1392,144L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
        />
        <path
          fill={color2}
          fillOpacity="0.8"
          style={{ animation: `wave ${slowWaveDuration * 1.2}s ease-in-out infinite` }}
          d="M0,256L48,261.3C96,267,192,277,288,261.3C384,245,480,203,576,186.7C672,171,768,181,864,197.3C960,213,1056,235,1152,229.3C1248,224,1344,192,1392,176L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
        />
      </svg>
      <style>{`
        @keyframes wave {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(-30px); }
        }
        @keyframes waveReverse {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(30px); }
        }
      `}</style>
    </div>
  );
};

// Grid Background - Enhanced with perspective and glow
const GridBackground: React.FC<{ 
  color?: string;
  color2?: string;
  speed?: number;
}> = ({ 
  color = '#00ffff',
  color2 = '#0a0a1a',
  speed = 1 
}) => {
  const flowDuration = 3 / speed;
  
  return (
    <div 
      className="absolute inset-0"
      style={{
        backgroundColor: color2,
        perspective: '500px',
      }}
    >
      {/* Static grid layer */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(${color}15 1px, transparent 1px),
            linear-gradient(90deg, ${color}15 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />
      {/* Animated grid layer with perspective */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(${color}30 2px, transparent 2px),
            linear-gradient(90deg, ${color}30 2px, transparent 2px)
          `,
          backgroundSize: '100px 100px',
          animation: `gridFlow ${flowDuration}s linear infinite`,
          transformStyle: 'preserve-3d',
        }}
      />
      {/* Horizon glow */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-32"
        style={{
          background: `linear-gradient(transparent, ${color}20)`,
        }}
      />
      <style>{`
        @keyframes gridFlow {
          0% { transform: translateY(0) rotateX(60deg); }
          100% { transform: translateY(100px) rotateX(60deg); }
        }
      `}</style>
    </div>
  );
};

// Starfield Background - Enhanced with shooting stars and parallax
const StarfieldBackground: React.FC<{ 
  color?: string;
  speed?: number;
}> = ({ 
  color = '#ffffff',
  speed = 1 
}) => {
  const stars = React.useMemo(() => 
    Array.from({ length: 150 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 0.5,
      duration: (Math.random() * 4 + 1) / speed,
      delay: Math.random() * 3,
      layer: Math.floor(Math.random() * 3), // 0, 1, 2 for parallax layers
    })),
    [speed]
  );

  const shootingStars = React.useMemo(() => 
    Array.from({ length: 3 }, (_, i) => ({
      id: i,
      startX: Math.random() * 30 + 10,
      startY: Math.random() * 30,
      duration: (Math.random() * 2 + 1) / speed,
      delay: Math.random() * 8 + i * 4,
    })),
    [speed]
  );

  return (
    <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a15] via-[#0d0d20] to-[#1a1a30]">
      {/* Stars by layer for parallax effect */}
      {[0, 1, 2].map(layer => (
        <div key={layer} className="absolute inset-0">
          {stars.filter(s => s.layer === layer).map(star => (
            <div
              key={star.id}
              className="absolute rounded-full"
              style={{
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: star.size * (1 + layer * 0.3),
                height: star.size * (1 + layer * 0.3),
                backgroundColor: color,
                opacity: 0.5 + layer * 0.2,
                animation: `twinkle ${star.duration}s ease-in-out ${star.delay}s infinite`,
              }}
            />
          ))}
        </div>
      ))}
      
      {/* Shooting stars */}
      {shootingStars.map(ss => (
        <div
          key={ss.id}
          className="absolute"
          style={{
            left: `${ss.startX}%`,
            top: `${ss.startY}%`,
            width: '100px',
            height: '2px',
            background: `linear-gradient(90deg, transparent, ${color})`,
            animation: `shootingStar ${ss.duration}s ease-in ${ss.delay}s infinite`,
            transformOrigin: 'left center',
          }}
        />
      ))}
      
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(0.8); }
        }
        @keyframes shootingStar {
          0% { 
            opacity: 0;
            transform: translateX(0) translateY(0) rotate(45deg);
          }
          10% {
            opacity: 1;
          }
          100% { 
            opacity: 0;
            transform: translateX(300px) translateY(300px) rotate(45deg);
          }
        }
      `}</style>
    </div>
  );
};