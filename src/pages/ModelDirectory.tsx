import { useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { GlobalHeader } from "@/components/GlobalHeader";
import { Footer } from "@/components/Footer";
import { useModelDirectory } from "@/hooks/useModelPages";
import { ModelDirectoryHero, ModelDirectoryGrid } from "@/components/model-landing";

export default function ModelDirectory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const { data: models, isLoading } = useModelDirectory(selectedCategory || undefined);

  const filteredModels = useMemo(() => {
    if (!models) return [];
    if (!searchQuery.trim()) return models;
    
    const query = searchQuery.toLowerCase();
    return models.filter(model => 
      model.model_name.toLowerCase().includes(query) ||
      model.provider.toLowerCase().includes(query) ||
      model.tagline?.toLowerCase().includes(query) ||
      model.description?.toLowerCase().includes(query)
    );
  }, [models, searchQuery]);

  return (
    <>
      <Helmet>
        <title>AI Models Directory | ARTIFIO.ai</title>
        <meta 
          name="description" 
          content="Explore our collection of AI models for image generation, video creation, audio synthesis, and more. Find the perfect AI model for your creative projects."
        />
        <meta name="keywords" content="AI models, image generation, video AI, audio AI, FLUX, Stable Diffusion, Kling, Minimax" />
        <link rel="canonical" href="https://artifio.ai/models" />
        
        {/* Open Graph */}
        <meta property="og:title" content="AI Models Directory | ARTIFIO.ai" />
        <meta property="og:description" content="Explore our collection of AI models for image generation, video creation, audio synthesis, and more." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://artifio.ai/models" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="AI Models Directory | ARTIFIO.ai" />
        <meta name="twitter:description" content="Explore our collection of AI models for image generation, video creation, audio synthesis, and more." />
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col">
        <GlobalHeader />
        
        <main className="flex-1">
          <ModelDirectoryHero
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedCategory={selectedCategory || undefined}
            onCategoryChange={(cat) => setSelectedCategory(cat || null)}
            totalModels={models?.length || 0}
          />
          
          <section className="container mx-auto px-4 py-12">
            <ModelDirectoryGrid 
              models={filteredModels} 
              isLoading={isLoading} 
            />
          </section>
        </main>
        
        <Footer />
      </div>
    </>
  );
}
