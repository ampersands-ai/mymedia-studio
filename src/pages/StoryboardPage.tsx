import { StoryboardInput } from '@/components/storyboard/StoryboardInput';
import { StoryboardEditor } from '@/components/storyboard/StoryboardEditor';
import { useStoryboard } from '@/hooks/useStoryboard';
import { Film, Sparkles, Edit3, Video } from 'lucide-react';
import { Card } from '@/components/ui/card';

const InfoCard = ({ icon, title, description }: { icon: string; title: string; description: string }) => (
  <Card className="p-6 text-center hover:scale-105 transition-transform bg-white/5 backdrop-blur-xl border-white/20">
    <div className="text-4xl mb-3">{icon}</div>
    <h3 className="font-bold text-lg mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground">{description}</p>
  </Card>
);

export default function StoryboardPage() {
  const { storyboard } = useStoryboard();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Film className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
              AI STORYBOARD GENERATOR
            </h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Create professional faceless videos with full creative control
          </p>
        </div>

        {/* Main Content - Conditional Rendering */}
        {!storyboard ? (
          <StoryboardInput />
        ) : (
          <StoryboardEditor />
        )}

        {/* Info Cards */}
        {!storyboard && (
          <div className="mt-12 grid sm:grid-cols-3 gap-6">
            <InfoCard
              icon="🎨"
              title="AI-Powered Generation"
              description="AI generates engaging scripts tailored to your topic"
            />
            <InfoCard
              icon="✏️"
              title="Full Editing Control"
              description="Edit every scene's script and visuals before rendering"
            />
            <InfoCard
              icon="🎬"
              title="Professional Results"
              description="High-quality videos with natural voiceover and visuals"
            />
          </div>
        )}
      </div>
    </div>
  );
}