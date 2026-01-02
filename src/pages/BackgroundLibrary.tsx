import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BACKGROUND_PRESETS, CATEGORY_FILTERS, CategoryFilter } from '@/data/backgroundPresets';
import { BackgroundPreset } from '@/types/procedural-background';
import { PresetCard } from '@/components/procedural/PresetCard';
import { PresetPreviewModal } from '@/components/procedural/PresetPreviewModal';
import { Button } from '@/components/ui/button';
import { Plus, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Helmet } from 'react-helmet-async';

export default function BackgroundLibrary() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('All');
  const [selectedPreset, setSelectedPreset] = useState<BackgroundPreset | null>(null);
  const [previewPreset, setPreviewPreset] = useState<BackgroundPreset | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const filteredPresets = useMemo(() => {
    if (activeCategory === 'All') return BACKGROUND_PRESETS;
    return BACKGROUND_PRESETS.filter((preset) => preset.category === activeCategory);
  }, [activeCategory]);

  const handleSelectPreset = (preset: BackgroundPreset) => {
    setSelectedPreset(preset);
    navigate('/dashboard/generator', { state: { preset } });
  };

  const handlePreviewPreset = (preset: BackgroundPreset) => {
    setPreviewPreset(preset);
    setIsPreviewOpen(true);
  };

  const handleClosePreview = () => {
    setIsPreviewOpen(false);
  };

  return (
    <>
      <Helmet>
        <title>Background Library | Procedural Video Backgrounds</title>
        <meta name="description" content="Browse and select from procedural 3D animated backgrounds for your videos. Choose from Abstract, Tech, Energetic, and Minimal styles." />
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 md:py-12">
          {/* Header */}
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground md:text-4xl">
                Background Library
              </h1>
              <p className="mt-2 text-muted-foreground">
                Choose a preset or create your own procedural background
              </p>
            </div>
            <Button
              onClick={() => navigate('/dashboard/generator')}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Create Custom
            </Button>
          </div>

          {/* Category filters */}
          <div className="mb-8 flex flex-wrap gap-2">
            {CATEGORY_FILTERS.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={cn(
                  'rounded-full border px-4 py-2 text-sm font-medium transition-all',
                  activeCategory === category
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground'
                )}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Presets grid */}
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {/* Create Custom card */}
            <button
              onClick={() => navigate('/dashboard/generator')}
              className={cn(
                'group relative flex aspect-[9/16] flex-col items-center justify-center gap-4 overflow-hidden rounded-xl border-2 border-dashed transition-all',
                'border-muted-foreground/30 bg-card hover:border-primary hover:bg-primary/5'
              )}
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted transition-colors group-hover:bg-primary/20">
                <Sparkles className="h-8 w-8 text-muted-foreground transition-colors group-hover:text-primary" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground">Create Custom</p>
                <p className="mt-1 text-sm text-muted-foreground">Design your own</p>
              </div>
            </button>

            {/* Preset cards */}
            {filteredPresets.map((preset) => (
              <PresetCard
                key={preset.id}
                preset={preset}
                onSelect={handleSelectPreset}
                onPreview={handlePreviewPreset}
                isSelected={selectedPreset?.id === preset.id}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Fullscreen preview modal */}
      <PresetPreviewModal
        preset={previewPreset}
        isOpen={isPreviewOpen}
        onClose={handleClosePreview}
        onSelect={handleSelectPreset}
      />
    </>
  );
}
