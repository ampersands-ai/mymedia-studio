import { useState } from 'react';
import { Music, Volume2, Zap, Sparkles, MessageSquare, AudioLines } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { CreateTab } from '../types/music-studio.types';

const CREATION_MODES = [
  { id: 'song', tab: 'song' as CreateTab, icon: Music, title: 'Create Song', color: 'primary-orange' },
  { id: 'tts', tab: 'tts' as CreateTab, icon: Volume2, title: 'Text to Speech', color: 'accent-pink' },
  { id: 'sfx', tab: 'sfx' as CreateTab, icon: Zap, title: 'Sound Effects', color: 'primary-orange' },
  { id: 'dialogue', tab: 'dialogue' as CreateTab, icon: MessageSquare, title: 'AI Dialogue', color: 'accent-purple' },
  { id: 'stt', tab: 'stt' as CreateTab, icon: AudioLines, title: 'Speech to Text', color: 'accent-pink' },
];

interface HomeViewProps {
  onNavigateToCreate: (tab?: CreateTab, prompt?: string) => void;
}

export function HomeView({ onNavigateToCreate }: HomeViewProps) {
  const [prompt, setPrompt] = useState('');
  const [selectedMode, setSelectedMode] = useState<CreateTab>('song');

  const handleGenerate = () => {
    onNavigateToCreate(selectedMode, prompt);
  };

  const handleModeClick = (tab: CreateTab) => {
    setSelectedMode(tab);
    // If there's already a prompt, navigate directly
    if (prompt.trim()) {
      onNavigateToCreate(tab, prompt);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Unified Hero Section */}
      <section className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary-orange/20 via-accent-purple/20 to-accent-pink/20 border border-border p-6 sm:p-8 md:p-10">
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-transparent" />
        <div className="relative z-10 space-y-6">
          {/* Header */}
          <div className="max-w-2xl">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground mb-2">
              What will you create today?
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Generate music, transform voices, and create sound effects with AI
            </p>
          </div>

          {/* Input + Generate */}
          <div className="flex flex-col sm:flex-row gap-3 max-w-2xl">
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              placeholder="Enter your idea..."
              className="flex-1 h-11 sm:h-12 bg-card/80 border-border text-sm sm:text-base"
            />
            <Button
              onClick={handleGenerate}
              className="h-11 sm:h-12 px-5 sm:px-6 bg-primary-orange hover:bg-primary-orange/90 text-black font-semibold w-full sm:w-auto"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generate
            </Button>
          </div>

          {/* Creation Mode Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {CREATION_MODES.map((mode) => {
              const Icon = mode.icon;
              const isSelected = selectedMode === mode.tab;
              return (
                <button
                  key={mode.id}
                  onClick={() => handleModeClick(mode.tab)}
                  className={`group p-4 rounded-xl bg-card/60 border transition-all duration-200 text-left ${
                    isSelected 
                      ? 'border-primary-orange bg-card/80' 
                      : 'border-border hover:border-primary-orange/50 hover:bg-card/80'
                  }`}
                >
                  <div className={`h-9 w-9 rounded-lg bg-${mode.color}/20 flex items-center justify-center mb-2`}>
                    <Icon className={`h-4 w-4 text-${mode.color}`} />
                  </div>
                  <p className="font-semibold text-sm text-foreground">{mode.title}</p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Recent Creations */}
      <section>
        <h2 className="text-lg font-bold text-foreground mb-4">Recent Creations</h2>
        <div className="rounded-xl border border-border bg-card/50 p-8 text-center">
          <p className="text-muted-foreground">No creations yet...</p>
        </div>
      </section>
    </div>
  );
}
