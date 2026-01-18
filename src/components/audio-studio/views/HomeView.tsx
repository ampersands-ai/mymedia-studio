import { Music, Mic, Volume2, Zap, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TrackCard } from '../shared/TrackCard';
import { MOCK_TRACKS, QUICK_ACTIONS } from '../data/mock-data';
import type { CreateTab } from '../types/audio-studio.types';

const ICONS = { Music, Mic, Volume2, Zap };

interface HomeViewProps {
  onNavigateToCreate: (tab?: CreateTab) => void;
}

export function HomeView({ onNavigateToCreate }: HomeViewProps) {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Section */}
      <section className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary-orange/20 via-accent-purple/20 to-accent-pink/20 border border-border p-4 sm:p-8 md:p-12">
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-transparent" />
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground mb-2 sm:mb-4">
            What will you create today?
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
            Generate music, transform voices, and create sound effects with AI
          </p>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Input
              placeholder="Describe your music idea..."
              className="flex-1 h-10 sm:h-12 bg-card/80 border-border text-sm sm:text-base"
            />
            <Button
              onClick={() => onNavigateToCreate('song')}
              className="h-10 sm:h-12 px-4 sm:px-6 bg-primary-orange hover:bg-primary-orange/90 text-black font-semibold w-full sm:w-auto"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generate
            </Button>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="text-lg font-bold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {QUICK_ACTIONS.map((action) => {
            const Icon = ICONS[action.icon as keyof typeof ICONS];
            return (
              <button
                key={action.id}
                onClick={() => onNavigateToCreate(action.tab)}
                className="group p-4 rounded-xl bg-card border border-border hover:border-primary-orange/50 hover:bg-muted/50 transition-all duration-200"
              >
                <div className={`h-10 w-10 rounded-lg bg-${action.color}/20 flex items-center justify-center mb-3`}>
                  <Icon className={`h-5 w-5 text-${action.color}`} />
                </div>
                <p className="font-semibold text-sm text-foreground text-left">{action.title}</p>
                <p className="text-xs text-muted-foreground text-left mt-1">{action.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Recent Tracks */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">Recent Creations</h2>
          <Button variant="ghost" size="sm" className="text-primary-orange">
            View All <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {MOCK_TRACKS.map((track) => (
            <TrackCard key={track.id} track={track} />
          ))}
        </div>
      </section>
    </div>
  );
}
