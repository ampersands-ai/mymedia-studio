import { useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { GlobalHeader } from "@/components/GlobalHeader";
import { Footer } from "@/components/Footer";
import { useModelDirectory } from "@/hooks/useModelPages";
import { ModelDirectoryHero, ModelDirectoryGrid } from "@/components/model-landing";
import { ModelDirectoryFilters } from "@/components/model-landing/ModelDirectoryFilters";
import { getDisplayProvider } from "@/lib/utils/provider-display";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { brand, brandUrl } from "@/config/brand";

export default function ModelDirectory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContentTypes, setSelectedContentTypes] = useState<string[]>([]);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  
  const { data: models, isLoading } = useModelDirectory();

  // Extract available content types and providers from models
  const { availableContentTypes, availableProviders } = useMemo(() => {
    if (!models) return { availableContentTypes: [], availableProviders: [] };
    
    const contentTypeCounts = new Map<string, number>();
    const providerCounts = new Map<string, number>();
    
    models.forEach(model => {
      // Count content types from content_type_groups (safely handle null/undefined/non-array)
      const groups = Array.isArray(model.content_type_groups) ? model.content_type_groups : [];
      groups.forEach(group => {
        if (group?.content_type) {
          const current = contentTypeCounts.get(group.content_type) || 0;
          contentTypeCounts.set(group.content_type, current + 1);
        }
      });
      
      // Count providers
      const displayProvider = model.display_provider || getDisplayProvider(model.provider);
      const current = providerCounts.get(displayProvider) || 0;
      providerCounts.set(displayProvider, current + 1);
    });
    
    return {
      availableContentTypes: Array.from(contentTypeCounts, ([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count),
      availableProviders: Array.from(providerCounts, ([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
    };
  }, [models]);

  const filteredModels = useMemo(() => {
    if (!models) return [];
    
    return models.filter(model => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matches = model.model_name.toLowerCase().includes(query) ||
          model.provider.toLowerCase().includes(query) ||
          model.tagline?.toLowerCase().includes(query) ||
          model.description?.toLowerCase().includes(query);
        if (!matches) return false;
      }
      
      // Content type filter (multi-select)
      if (selectedContentTypes.length > 0) {
        const modelTypes = model.content_type_groups?.map(g => g.content_type) || [];
        const hasMatchingType = selectedContentTypes.some(t => modelTypes.includes(t));
        if (!hasMatchingType) return false;
      }
      
      // Provider filter (multi-select)
      if (selectedProviders.length > 0) {
        const displayProvider = model.display_provider || getDisplayProvider(model.provider);
        if (!selectedProviders.includes(displayProvider)) return false;
      }
      
      return true;
    });
  }, [models, searchQuery, selectedContentTypes, selectedProviders]);

  const hasActiveFilters = selectedContentTypes.length > 0 || selectedProviders.length > 0;
  const activeFilterCount = selectedContentTypes.length + selectedProviders.length;

  const clearAllFilters = () => {
    setSelectedContentTypes([]);
    setSelectedProviders([]);
    setSearchQuery("");
  };

  const FiltersContent = (
    <ModelDirectoryFilters
      selectedContentTypes={selectedContentTypes}
      onContentTypesChange={setSelectedContentTypes}
      selectedProviders={selectedProviders}
      onProvidersChange={setSelectedProviders}
      availableContentTypes={availableContentTypes}
      availableProviders={availableProviders}
    />
  );

  return (
    <>
      <Helmet>
        <title>{`AI Models Directory | ${brand.name}`}</title>
        <meta
          name="description"
          content="Explore our collection of AI models for image generation, video creation, audio synthesis, and more. Find the perfect AI model for your creative projects."
        />
        <meta name="keywords" content="AI models, image generation, video AI, audio AI, FLUX, Stable Diffusion, Kling, Minimax" />
        <link rel="canonical" href={brandUrl('/models')} />

        {/* Open Graph */}
        <meta property="og:title" content={`AI Models Directory | ${brand.name}`} />
        <meta property="og:description" content="Explore our collection of AI models for image generation, video creation, audio synthesis, and more." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={brandUrl('/models')} />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`AI Models Directory | ${brand.name}`} />
        <meta name="twitter:description" content="Explore our collection of AI models for image generation, video creation, audio synthesis, and more." />
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col">
        <GlobalHeader />
        
        <main className="flex-1 pt-16">
          <ModelDirectoryHero
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            totalModels={models?.length || 0}
          />
          
          <section className="container mx-auto px-4 py-8">
            {/* Mobile filter button */}
            <div className="lg:hidden mb-4 flex items-center gap-2">
              <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    Filters
                    {activeFilterCount > 0 && (
                      <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 p-0">
                  <SheetHeader className="p-4 border-b">
                    <SheetTitle>Filters</SheetTitle>
                  </SheetHeader>
                  <div className="p-4">
                    {FiltersContent}
                  </div>
                </SheetContent>
              </Sheet>
              
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters} className="gap-1.5">
                  <X className="h-4 w-4" />
                  Clear all
                </Button>
              )}
            </div>

            {/* Desktop layout with sidebar */}
            <div className="flex gap-8">
              {/* Left sidebar - filters (desktop only) */}
              {FiltersContent}
              
              {/* Main content */}
              <div className="flex-1 min-w-0">
                {/* Results count */}
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">
                    {filteredModels.length} {filteredModels.length === 1 ? 'model' : 'models'}
                    {hasActiveFilters && ' matching filters'}
                  </p>
                </div>
                
                <ModelDirectoryGrid 
                  models={filteredModels} 
                  isLoading={isLoading} 
                />
              </div>
            </div>
          </section>
        </main>
        
        <Footer />
      </div>
    </>
  );
}
