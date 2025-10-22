import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Carousel, CarouselViewport, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useAllTemplates } from "@/hooks/useTemplates";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Package, Users, TrendingUp, Layers, Wand2, Coins, Shirt, Plane } from "lucide-react";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { createSignedUrl } from "@/lib/storage-utils";


const Templates = () => {
  const { user } = useAuth();
  const { data: allTemplates, isLoading } = useAllTemplates();
  const navigate = useNavigate();
  
  // State for signed URLs for before/after images
  const [signedUrls, setSignedUrls] = useState<Record<string, { before: string | null, after: string | null }>>({});
  
  // State for token costs
  const [tokenCosts, setTokenCosts] = useState<Record<string, number>>({});
  
  // State for category filtering
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['All']);

  useEffect(() => {
    document.title = "Templates - Artifio.ai";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Ready-to-use AI templates for videos, images, audio, and text. Start creating in seconds with professional templates.');
    }
  }, []);

  // Calculate token costs for all templates - OPTIMIZED with single batch query
  useEffect(() => {
    const calculateTokenCosts = async () => {
      if (!allTemplates) return;
      
      // Collect all unique model_record_ids from all templates
      const allModelRecordIds = new Set<string>();
      
      allTemplates.forEach(template => {
        if (template.template_type === 'workflow' && template.workflow_steps) {
          template.workflow_steps.forEach((step: any) => {
            if (step.model_record_id) {
              allModelRecordIds.add(step.model_record_id);
            }
          });
        } else if (template.template_type === 'template' && 'model_record_id' in template && template.model_record_id) {
          allModelRecordIds.add(template.model_record_id as string);
        }
      });
      
      // Single batch query to get all model costs at once
      if (allModelRecordIds.size === 0) return;
      
      const { data: models } = await supabase
        .from("ai_models")
        .select("record_id, base_token_cost")
        .in("record_id", Array.from(allModelRecordIds));
      
      if (!models) return;
      
      // Create lookup map for O(1) access
      const modelCostMap = new Map(
        models.map(m => [m.record_id, m.base_token_cost])
      );
      
      // Calculate costs for each template
      const costs: Record<string, number> = {};
      
      allTemplates.forEach(template => {
        if (template.template_type === 'workflow' && template.workflow_steps) {
          const totalCost = template.workflow_steps.reduce((sum: number, step: any) => {
            return sum + (modelCostMap.get(step.model_record_id) || 0);
          }, 0);
          costs[template.id] = totalCost;
        } else if (template.template_type === 'template' && 'model_record_id' in template && template.model_record_id) {
          costs[template.id] = modelCostMap.get(template.model_record_id as string) || 0;
        }
      });
      
      setTokenCosts(costs);
    };
    
    calculateTokenCosts();
  }, [allTemplates]);

  // Generate signed URLs for templates with before/after images - OPTIMIZED with parallel processing
  useEffect(() => {
    const generateSignedUrls = async () => {
      if (!allTemplates) return;
      
      // Helper function to extract storage path and generate signed URL
      const getSignedUrl = async (url: string | null): Promise<string | null> => {
        if (!url) return null;
        
        if (url.startsWith('http')) {
          const match = url.match(/generated-content\/(.+)$/);
          if (match) {
            return createSignedUrl('generated-content', match[1]);
          }
        } else {
          return createSignedUrl('generated-content', url);
        }
        return null;
      };
      
      // Process all templates in parallel
      const urlPromises = allTemplates
        .filter(template => template.before_image_url || template.after_image_url)
        .map(async (template) => {
          const [beforeUrl, afterUrl] = await Promise.all([
            getSignedUrl(template.before_image_url || null),
            getSignedUrl(template.after_image_url || null)
          ]);
          
          return {
            id: template.id,
            urls: { before: beforeUrl, after: afterUrl }
          };
        });
      
      const results = await Promise.all(urlPromises);
      
      const urlsMap: Record<string, { before: string | null, after: string | null }> = {};
      results.forEach(result => {
        urlsMap[result.id] = result.urls;
      });
      
      setSignedUrls(urlsMap);
    };
    
    generateSignedUrls();
  }, [allTemplates]);

  const getTemplateIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "product":
        return Package;
      case "marketing":
        return TrendingUp;
      case "fantasy":
        return Wand2;
      case "portraits":
        return Users;
      case "abstract":
        return Layers;
      case "fashion":
        return Shirt;
      case "travel":
        return Plane;
      case "baby milestones":
        return Sparkles;
      default:
        return Sparkles;
    }
  };

  const getWorkflowContentType = (template: any): "Video" | "Image" => {
    // Check if template has workflow_steps to determine output type
    if (template.workflow_steps && Array.isArray(template.workflow_steps)) {
      const lastStep = template.workflow_steps[template.workflow_steps.length - 1];
      if (lastStep?.model_id) {
        const modelId = lastStep.model_id.toLowerCase();
        // Check for video model keywords
        if (modelId.includes("video") || modelId.includes("sora") || modelId.includes("runway") || 
            modelId.includes("kling") || modelId.includes("luma") || modelId.includes("veo") ||
            modelId.includes("hailuo") || modelId.includes("wan")) {
          return "Video";
        }
      }
    }
    // Also check category as fallback
    if (template.category?.toLowerCase().includes("video")) {
      return "Video";
    }
    return "Image";
  };

  // Extract unique categories with counts
  const templates = (allTemplates || []).sort((a, b) => a.display_order - b.display_order);
  const uniqueCategories = Array.from(new Set(templates.map(t => t.category))).sort();
  const categoryCounts = uniqueCategories.reduce((acc, cat) => {
    acc[cat] = templates.filter(t => t.category === cat).length;
    return acc;
  }, {} as Record<string, number>);
  
  // Toggle category filter
  const handleCategoryToggle = (category: string) => {
    if (category === 'All') {
      setSelectedCategories(['All']);
    } else {
      setSelectedCategories(prev => {
        const withoutAll = prev.filter(c => c !== 'All');
        if (withoutAll.includes(category)) {
          const filtered = withoutAll.filter(c => c !== category);
          return filtered.length === 0 ? ['All'] : filtered;
        } else {
          return [...withoutAll, category];
        }
      });
    }
  };
  
  // Filter templates by selected categories
  const showAllCategories = selectedCategories.includes('All');
  const productTemplates = templates.filter(t => t.category === "Product");
  const marketingTemplates = templates.filter(t => t.category === "Marketing");
  const fantasyTemplates = templates.filter(t => t.category === "Fantasy");
  const portraitsTemplates = templates.filter(t => t.category === "Portraits");
  const abstractTemplates = templates.filter(t => t.category === "Abstract");
  const fashionTemplates = templates.filter(t => t.category === "Fashion");
  const travelTemplates = templates.filter(t => t.category === "Travel");
  const babyMilestonesTemplates = templates.filter(t => t.category === "Baby Milestones");

  const handleUseTemplate = (template: any) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    // Navigate based on template type
    if (template.template_type === 'workflow') {
      navigate(`/dashboard/create-workflow?workflow=${template.id}`);
    } else {
      navigate(`/dashboard/custom-creation?template=${template.id}`);
    }
  };

  const renderCarousel = (categoryTemplates: any[], categoryName: string) => {
    if (categoryTemplates.length === 0) return null;

    return (
      <div className="space-y-4">
        <h2 className="text-2xl md:text-3xl font-black">{categoryName}</h2>
        <Carousel 
          className="w-full"
          opts={{
            align: "start",
            containScroll: "trimSnaps",
            dragFree: true,
          }}
        >
          <CarouselViewport>
            <CarouselContent className="-ml-4">
              {categoryTemplates.map((template) => {
                const Icon = getTemplateIcon(template.category || '');
                const contentType = getWorkflowContentType(template);
                return (
                  <CarouselItem key={template.id} className="pl-4 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6">
                    <Card className="group hover:shadow-brutal transition-all overflow-hidden border-2 border-black">
                      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-primary/10 to-accent/10">
                        {signedUrls[template.id]?.before && signedUrls[template.id]?.after ? (
                          <BeforeAfterSlider
                            beforeImage={signedUrls[template.id].after!}
                            afterImage={signedUrls[template.id].before!}
                            beforeLabel=""
                            afterLabel=""
                            defaultPosition={25}
                            showHint={true}
                            className="w-full h-full"
                          />
                        ) : signedUrls[template.id]?.before || signedUrls[template.id]?.after ? (
                          <img 
                            src={(signedUrls[template.id]?.after || signedUrls[template.id]?.before)!}
                            alt={template.name || ''}
                            className="w-full h-full object-cover"
                          />
                        ) : template.thumbnail_url ? (
                          <img 
                            src={template.thumbnail_url} 
                            alt={template.name || ''}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Icon className="h-12 w-12 text-primary/30" />
                          </div>
                        )}
                        <Badge variant="secondary" className="absolute top-1 right-1 backdrop-blur-sm bg-background/80 text-xs px-1.5 py-0">
                          {contentType}
                        </Badge>
                      </div>
                      
                      <div className="p-2 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium line-clamp-1 flex-1">{template.name}</p>
                          {tokenCosts[template.id] !== undefined && (
                            <Badge variant="outline" className="text-xs px-1 py-0 ml-1 flex items-center gap-0.5">
                              <Coins className="h-2.5 w-2.5" />
                              {tokenCosts[template.id]}
                            </Badge>
                          )}
                        </div>
                        
                        <Button 
                          onClick={() => handleUseTemplate(template)}
                          className="w-full h-7 text-xs"
                          size="sm"
                        >
                          <Sparkles className="mr-1 h-3 w-3" />
                          Use
                        </Button>
                      </div>
                    </Card>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
          </CarouselViewport>
          <CarouselPrevious className="border-2 border-black z-20" />
          <CarouselNext className="border-2 border-black z-20" />
        </Carousel>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="border-b">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="max-w-4xl mx-auto text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight">
              AI Templates
            </h1>
            <p className="text-lg text-muted-foreground">
              Ready-to-use templates for videos, images, and more. Start creating in seconds.
            </p>
          </div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <Button
                variant={selectedCategories.includes('All') ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleCategoryToggle('All')}
                className={selectedCategories.includes('All') ? 'border-2 border-black' : 'border-2'}
              >
                All ({templates.length})
              </Button>
              {uniqueCategories.map(category => (
                <Button
                  key={category}
                  variant={selectedCategories.includes(category) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleCategoryToggle(category)}
                  className={selectedCategories.includes(category) ? 'border-2 border-black' : 'border-2'}
                >
                  {category} ({categoryCounts[category]})
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Templates Grid */}
      <section className="bg-background">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="max-w-7xl mx-auto space-y-12">
            {(showAllCategories || selectedCategories.includes("Product")) && renderCarousel(productTemplates, "Product")}
            {(showAllCategories || selectedCategories.includes("Marketing")) && renderCarousel(marketingTemplates, "Marketing")}
            {(showAllCategories || selectedCategories.includes("Fantasy")) && renderCarousel(fantasyTemplates, "Fantasy")}
            {(showAllCategories || selectedCategories.includes("Portraits")) && renderCarousel(portraitsTemplates, "Portraits")}
            {(showAllCategories || selectedCategories.includes("Abstract")) && renderCarousel(abstractTemplates, "Abstract")}
            {(showAllCategories || selectedCategories.includes("Fashion")) && renderCarousel(fashionTemplates, "Fashion")}
            {(showAllCategories || selectedCategories.includes("Travel")) && renderCarousel(travelTemplates, "Travel")}
            {(showAllCategories || selectedCategories.includes("Baby Milestones")) && renderCarousel(babyMilestonesTemplates, "Baby Milestones")}

            {/* Loading and Empty States */}
            {isLoading && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="aspect-square bg-muted" />
                    <div className="p-2">
                      <div className="h-3 bg-muted rounded w-3/4" />
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {!isLoading && templates.length === 0 && (
              <div className="text-center py-12">
                <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No templates available.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <Card className="max-w-2xl mx-auto border-2 border-border shadow-sm">
            <CardContent className="p-6 md:p-8 text-center space-y-4">
              <h2 className="text-2xl md:text-3xl font-black">Can't Find What You Need?</h2>
              <p className="text-muted-foreground">
                Explore all our AI models for custom creations
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <Button asChild size="lg" variant="neon">
                  <Link to="/dashboard/custom-creation">Start Creating</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/features">View All Features</Link>
                </Button>
              </div>
          </CardContent>
        </Card>
        </div>
      </section>
    </div>
  );
};

export default Templates;