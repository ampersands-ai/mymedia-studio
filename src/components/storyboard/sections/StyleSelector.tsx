import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import hyperRealisticImg from '@/assets/styles/hyper-realistic.jpg';
import cinematicImg from '@/assets/styles/cinematic.jpg';
import animatedImg from '@/assets/styles/animated.jpg';
import cartoonImg from '@/assets/styles/cartoon.jpg';
import naturalImg from '@/assets/styles/natural.jpg';
import sketchImg from '@/assets/styles/sketch.jpg';
import horrorImg from '@/assets/styles/horror.jpg';
import vintageImg from '@/assets/styles/vintage.jpg';
import cyberpunkImg from '@/assets/styles/cyberpunk.jpg';
import fantasyImg from '@/assets/styles/fantasy.jpg';
import noirImg from '@/assets/styles/noir.jpg';
import animeImg from '@/assets/styles/anime.jpg';
import watercolorImg from '@/assets/styles/watercolor.jpg';
import popArtImg from '@/assets/styles/pop-art.jpg';
import minimalistImg from '@/assets/styles/minimalist.jpg';
import surrealImg from '@/assets/styles/surreal.jpg';

const STYLES = [
  { 
    value: 'hyper-realistic', 
    label: 'Hyper Realistic', 
    emoji: '📷',
    image: hyperRealisticImg.src,
    description: 'Ultra-realistic, photo-quality visuals'
  },
  { 
    value: 'cinematic', 
    label: 'Cinematic', 
    emoji: '🎬',
    image: cinematicImg.src,
    description: 'Movie-like dramatic lighting & composition'
  },
  { 
    value: 'animated', 
    label: 'Animated', 
    emoji: '✨',
    image: animatedImg.src,
    description: '3D rendered, Pixar-style animation'
  },
  { 
    value: 'cartoon', 
    label: 'Cartoon', 
    emoji: '🎨',
    image: cartoonImg.src,
    description: '2D illustrated, playful cartoon style'
  },
  { 
    value: 'natural', 
    label: 'Natural', 
    emoji: '🍃',
    image: naturalImg.src,
    description: 'Natural photography, authentic look'
  },
  { 
    value: 'sketch', 
    label: 'Sketch', 
    emoji: '✏️',
    image: sketchImg.src,
    description: 'Hand-drawn, artistic pencil sketch'
  },
  { 
    value: 'horror', 
    label: 'Horror', 
    emoji: '👻',
    image: horrorImg.src,
    description: 'Dark, eerie, atmospheric visuals'
  },
  { 
    value: 'vintage', 
    label: 'Vintage', 
    emoji: '📽️',
    image: vintageImg.src,
    description: 'Classic retro film aesthetic'
  },
  { 
    value: 'cyberpunk', 
    label: 'Cyberpunk', 
    emoji: '🌃',
    image: cyberpunkImg.src,
    description: 'Neon-lit futuristic cityscape'
  },
  { 
    value: 'fantasy', 
    label: 'Fantasy', 
    emoji: '🧙',
    image: fantasyImg.src,
    description: 'Magical, ethereal world visuals'
  },
  { 
    value: 'noir', 
    label: 'Noir', 
    emoji: '🎩',
    image: noirImg.src,
    description: 'Black & white, dramatic shadows'
  },
  { 
    value: 'anime', 
    label: 'Anime', 
    emoji: '🎌',
    image: animeImg.src,
    description: 'Japanese animation style'
  },
  { 
    value: 'watercolor', 
    label: 'Watercolor', 
    emoji: '🖌️',
    image: watercolorImg.src,
    description: 'Soft, painted artistic look'
  },
  { 
    value: 'pop-art', 
    label: 'Pop Art', 
    emoji: '💥',
    image: popArtImg.src,
    description: 'Bold colors, comic-book inspired'
  },
  { 
    value: 'minimalist', 
    label: 'Minimalist', 
    emoji: '⬜',
    image: minimalistImg.src,
    description: 'Clean, simple, modern aesthetic'
  },
  { 
    value: 'surreal', 
    label: 'Surreal', 
    emoji: '🌀',
    image: surrealImg.src,
    description: 'Dreamlike, abstract visuals'
  },
];

interface StyleSelectorProps {
  style: string;
  onStyleChange: (style: string) => void;
  disabled?: boolean;
}

export function StyleSelector({ style, onStyleChange, disabled }: StyleSelectorProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleStyleSelect = (value: string) => {
    onStyleChange(value);
    setDialogOpen(false);
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Video Style</Label>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full justify-start" disabled={disabled}>
            <Palette className="w-4 h-4 mr-2" />
            {STYLES.find(s => s.value === style)?.emoji} {STYLES.find(s => s.value === style)?.label}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl lg:max-w-6xl max-h-[90vh] flex flex-col p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Choose a Style</DialogTitle>
          </DialogHeader>

          {/* Mobile Compact Grid */}
          <ScrollArea className="sm:hidden h-[70vh] -mx-4 px-4 overscroll-contain">
            <div className="grid grid-cols-2 gap-2 p-1 pb-4">
              {STYLES.map((styleOption) => (
                <button
                  key={styleOption.value}
                  onClick={() => handleStyleSelect(styleOption.value)}
                  className={cn(
                    "group relative flex flex-col gap-1.5 p-2 rounded-lg border-2 transition-all bg-card text-left",
                    style === styleOption.value 
                      ? "border-primary ring-2 ring-primary/20" 
                      : "border-muted hover:border-primary/50"
                  )}
                >
                  <div className="w-full aspect-[4/3] rounded overflow-hidden">
                    <img src={styleOption.image} alt={styleOption.label} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">{styleOption.emoji} {styleOption.label}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">{styleOption.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>

          {/* Desktop Card Grid */}
          <div className="hidden sm:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[calc(90vh-140px)] overflow-y-auto px-2 py-1">
            {STYLES.map((styleOption) => (
              <div
                key={styleOption.value}
                className={cn(
                  "relative cursor-pointer rounded-lg overflow-hidden transition-all border-2 max-w-md mx-auto md:max-w-none w-full",
                  style === styleOption.value
                    ? "border-primary ring-4 ring-primary/20"
                    : "border-muted hover:border-primary/50"
                )}
                onClick={() => handleStyleSelect(styleOption.value)}
              >
                <div className="relative aspect-[16/10] sm:aspect-video md:aspect-[21/9] overflow-hidden bg-muted min-h-[180px] sm:min-h-0">
                  <img
                    src={styleOption.image}
                    alt={styleOption.label}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  
                  {/* Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  
                  {/* Selected Checkmark */}
                  {style === styleOption.value && (
                    <div className="absolute top-2 right-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  
                  {/* Style Info */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                    <p className="text-white font-bold text-sm sm:text-base leading-tight">
                      {styleOption.emoji} {styleOption.label}
                    </p>
                    <p className="text-white/80 text-xs sm:text-sm mt-0.5 leading-relaxed">
                      {styleOption.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
