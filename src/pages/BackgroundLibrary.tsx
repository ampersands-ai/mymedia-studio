import { useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { BACKGROUND_PRESETS, CATEGORY_FILTERS, CategoryFilter } from '@/data/backgroundPresets';
import { BackgroundPreset } from '@/types/procedural-background';
import { PresetCard } from '@/components/procedural/PresetCard';
import { PresetPreviewModal } from '@/components/procedural/PresetPreviewModal';
import { Button } from '@/components/ui/button';
import { Plus, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Helmet } from 'react-helmet-async';
import { Skeleton } from '@/components/ui/skeleton';

// Calculate columns based on container width
function useResponsiveColumns(containerWidth: number): number {
  if (containerWidth >= 1280) return 5; // xl
  if (containerWidth >= 1024) return 4; // lg
  if (containerWidth >= 768) return 3;  // md
  if (containerWidth >= 640) return 2;  // sm
  return 2;
}

export default function BackgroundLibrary() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('All');
  const [selectedPreset, setSelectedPreset] = useState<BackgroundPreset | null>(null);
  const [previewPreset, setPreviewPreset] = useState<BackgroundPreset | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [containerWidth, setContainerWidth] = useState(1200);
  
  const parentRef = useRef<HTMLDivElement>(null);
  const columnCount = useResponsiveColumns(containerWidth);

  const filteredPresets = useMemo(() => {
    if (activeCategory === 'All') return BACKGROUND_PRESETS;
    return BACKGROUND_PRESETS.filter((preset) => preset.category === activeCategory);
  }, [activeCategory]);

  // Add 1 for the "Create Custom" card
  const totalItems = filteredPresets.length + 1;
  const rowCount = Math.ceil(totalItems / columnCount);
  
  // Estimate row height: card aspect ratio 9/16 + padding + info section
  const estimatedRowHeight = 320;

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedRowHeight,
    overscan: 2,
  });

  // Handle container resize - set initial width on mount
  const updateContainerWidth = useCallback(() => {
    if (parentRef.current) {
      setContainerWidth(parentRef.current.offsetWidth);
    }
  }, []);

  // Set up resize observer with useEffect instead of useMemo
  useMemo(() => {
    if (typeof window !== 'undefined') {
      const resizeObserver = new ResizeObserver(updateContainerWidth);
      if (parentRef.current) {
        resizeObserver.observe(parentRef.current);
      }
      return () => resizeObserver.disconnect();
    }
    return undefined;
  }, [updateContainerWidth]);

  const handleSelectPreset = useCallback((preset: BackgroundPreset) => {
    setSelectedPreset(preset);
    navigate('/dashboard/generator', { state: { preset } });
  }, [navigate]);

  const handlePreviewPreset = useCallback((preset: BackgroundPreset) => {
    setPreviewPreset(preset);
    setIsPreviewOpen(true);
  }, []);

  const handleClosePreview = useCallback(() => {
    setIsPreviewOpen(false);
  }, []);

  // Get items for a specific row
  const getRowItems = useCallback((rowIndex: number) => {
    const startIndex = rowIndex * columnCount;
    const items: (BackgroundPreset | 'create-custom')[] = [];
    
    for (let col = 0; col < columnCount; col++) {
      const itemIndex = startIndex + col;
      if (itemIndex === 0) {
        items.push('create-custom');
      } else if (itemIndex - 1 < filteredPresets.length) {
        items.push(filteredPresets[itemIndex - 1]);
      }
    }
    
    return items;
  }, [columnCount, filteredPresets]);

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

          {/* Virtualized Presets Grid */}
          <div
            ref={parentRef}
            className="h-[calc(100vh-280px)] overflow-auto"
            style={{ contain: 'strict' }}
          >
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const rowItems = getRowItems(virtualRow.index);
                
                return (
                  <div
                    key={virtualRow.key}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <div 
                      className="grid gap-4 h-full"
                      style={{ 
                        gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` 
                      }}
                    >
                      {rowItems.map((item) => {
                        if (item === 'create-custom') {
                          return (
                            <button
                              key="create-custom"
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
                          );
                        }
                        
                        return (
                          <PresetCard
                            key={item.id}
                            preset={item}
                            onSelect={handleSelectPreset}
                            onPreview={handlePreviewPreset}
                            isSelected={selectedPreset?.id === item.id}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
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

// Loading skeleton for initial render
export function BackgroundLibrarySkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: 15 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
          <Skeleton className="aspect-[9/16]" />
          <div className="p-3">
            <Skeleton className="h-5 w-24 mb-2" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}
