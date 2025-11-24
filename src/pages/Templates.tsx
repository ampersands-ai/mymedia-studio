import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { Badge } from "@/components/ui/badge";
import { Carousel, CarouselViewport, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useAllTemplates } from "@/hooks/useTemplates";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getAllModels } from "@/lib/models/registry";
import { Sparkles, Package, Users, TrendingUp, Layers, Wand2, Coins, Shirt, Plane, Search, Image as ImageIcon, Video } from "lucide-react";
import { OptimizedBeforeAfterSlider } from "@/components/OptimizedBeforeAfterSlider";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { LazyCarousel } from "@/components/LazyCarousel";
import { TemplateSkeleton } from "@/components/ui/skeletons";
import { LoadingTransition } from "@/components/ui/loading-transition";
import { useImagePreloader } from "@/hooks/useImagePreloader";
import { createSignedUrl } from "@/lib/storage-utils";

interface WorkflowStep {
  model_id: string;
  model_record_id: string;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  category: string;
  template_type: string;
  display_order: number;
  workflow_steps?: WorkflowStep[];
  thumbnail_url?: string;
  before_image_url?: string;
  after_image_url?: string;
}

const Templates = () => {
  const { user } = useAuth();
  const { execute } = useErrorHandler();
  const { data: allTemplates, isLoading } = useAllTemplates();
  const navigate = useNavigate();
  
  // State for signed URLs for before/after images and thumbnails
  const [signedUrls, setSignedUrls] = useState<Record<string, { before: string | null, after: string | null, thumbnail: string | null }>>({});
  
  // State for token costs
  const [tokenCosts, setTokenCosts] = useState<Record<string, number>>({});
  
  // State for search and content type filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [contentTypeFilter, setContentTypeFilter] = useState<'all' | 'image' | 'video'>('all');

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
          const steps = template.workflow_steps as WorkflowStep[];
          steps.forEach((step: WorkflowStep) => {
            if (step.model_record_id) {
              allModelRecordIds.add(step.model_record_id);
            }
          });
        }
      });
      
      // Get all models from registry
      if (allModelRecordIds.size === 0) return;

      const allModels = getAllModels();
      const models = allModels
        .filter(m => allModelRecordIds.has(m.MODEL_CONFIG.recordId))
        .map(m => ({
          record_id: m.MODEL_CONFIG.recordId,
          base_token_cost: m.MODEL_CONFIG.baseCreditCost
        }));

      if (!models) return;

      // Create lookup map for O(1) access
      const modelCostMap = new Map(
        models.map(m => [m.record_id, m.base_token_cost])
      );
      
      // Calculate costs for each template
      const costs: Record<string, number> = {};
      
      allTemplates.forEach(template => {
        if (template.template_type === 'workflow' && template.workflow_steps) {
          const steps = template.workflow_steps as WorkflowStep[];
          const totalCost = steps.reduce((sum: number, step: WorkflowStep) => {
            return sum + (modelCostMap.get(step.model_record_id) || 0);
          }, 0);
          costs[template.id] = totalCost;
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
        
        try {
          if (url.startsWith('http')) {
            // Parse URL to extract path after bucket name
            const urlObj = new URL(url);
            const pathMatch = urlObj.pathname.match(/\/generated-content\/(.+)$/);
            if (pathMatch) {
              // Extract clean path without query strings
              const cleanPath = pathMatch[1].split('?')[0];
              return createSignedUrl('generated-content', cleanPath);
            }
          } else {
            // Remove any query strings and leading slashes
            const cleanPath = url.split('?')[0].replace(/^\/+/, '');
            return createSignedUrl('generated-content', cleanPath);
          }
        } catch (error) {
          logger.warn('Failed to generate signed URL for template', { 
            component: 'Templates',
            operation: 'generateSignedUrls',
            url,
            error: (error as Error).message
          });
        }
        return null;
      };
      
      // Process all templates in parallel
      await execute(
        async () => {
          const urlPromises = allTemplates
            .filter(template => template.before_image_url || template.after_image_url || template.thumbnail_url)
            .map(async (template) => {
              const [beforeUrl, afterUrl, thumbnailUrl] = await Promise.all([
                getSignedUrl(template.before_image_url || null),
                getSignedUrl(template.after_image_url || null),
                getSignedUrl(template.thumbnail_url || null)
              ]);

              return {
                id: template.id,
                urls: { before: beforeUrl, after: afterUrl, thumbnail: thumbnailUrl }
              };
            });

          const results = await Promise.all(urlPromises);

          const urlsMap: Record<string, { before: string | null, after: string | null, thumbnail: string | null }> = {};
          results.forEach(result => {
            urlsMap[result.id] = result.urls as { before: string | null, after: string | null, thumbnail: string | null };
          });

          setSignedUrls(urlsMap);
        },
        {
          showSuccessToast: false,
          showErrorToast: false,
          context: {
            component: 'Templates',
            operation: 'generateSignedUrls',
            templateCount: allTemplates.length
          }
        }
      );
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

  const getWorkflowContentType = (template: WorkflowTemplate): "Video" | "Image" => {
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

  // Sort templates by display order
  const templates = (allTemplates || []).sort((a, b) => a.display_order - b.display_order);
  
  // Filter templates by search query and content type
  const filterTemplates = (templates: WorkflowTemplate[]) => {
    let filtered = templates;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(query) || 
        (t.description || '').toLowerCase().includes(query)
      );
    }
    
    // Apply content type filter
    if (contentTypeFilter !== 'all') {
      filtered = filtered.filter(t => {
        const type = getWorkflowContentType(t);
        return contentTypeFilter === 'image' 
          ? type === 'Image' 
          : type === 'Video';
      });
    }
    
    return filtered;
  };
  
  const filteredTemplates = filterTemplates(templates);
  
  // Filter by category
  const productTemplates = filteredTemplates.filter(t => t.category === "Product");
  const marketingTemplates = filteredTemplates.filter(t => t.category === "Marketing");
  const fantasyTemplates = filteredTemplates.filter(t => t.category === "Fantasy");
  const portraitsTemplates = filteredTemplates.filter(t => t.category === "Portraits");
  const abstractTemplates = filteredTemplates.filter(t => t.category === "Abstract");
  const fashionTemplates = filteredTemplates.filter(t => t.category === "Fashion");
  const travelTemplates = filteredTemplates.filter(t => t.category === "Travel");
  const babyMilestonesTemplates = filteredTemplates.filter(t => t.category === "Baby Milestones");
  
  // Count content types
  const imageCount = templates.filter(t => getWorkflowContentType(t) === 'Image').length;
  const videoCount = templates.filter(t => getWorkflowContentType(t) === 'Video').length;

  // Extract image URLs for ONLY the first visible carousel
  const imageUrls = useMemo(() => {
    const urls: string[] = [];
    
    // Determine which category has templates to show first
    const firstCategoryTemplates = 
      productTemplates.length > 0 ? productTemplates :
      marketingTemplates.length > 0 ? marketingTemplates :
      fantasyTemplates.length > 0 ? fantasyTemplates :
      portraitsTemplates.length > 0 ? portraitsTemplates :
      abstractTemplates.length > 0 ? abstractTemplates :
      fashionTemplates.length > 0 ? fashionTemplates :
      travelTemplates.length > 0 ? travelTemplates :
      babyMilestonesTemplates.length > 0 ? babyMilestonesTemplates :
      [];
    
    // Only preload images from first carousel (max 12 items)
    const firstCarouselTemplates = firstCategoryTemplates.slice(0, 12);
    
    firstCarouselTemplates.forEach(template => {
      if (signedUrls[template.id]?.before) urls.push(signedUrls[template.id].before!);
      if (signedUrls[template.id]?.after) urls.push(signedUrls[template.id].after!);
      if (signedUrls[template.id]?.thumbnail) {
        urls.push(signedUrls[template.id].thumbnail!);
      } else if (template.thumbnail_url) {
        urls.push(template.thumbnail_url);
      }
    });
    
    return urls;
  }, [
    productTemplates, marketingTemplates, fantasyTemplates, 
    portraitsTemplates, abstractTemplates, fashionTemplates,
    travelTemplates, babyMilestonesTemplates, signedUrls
  ]);

  // Preload images with shorter timeout (no gating on isLoading)
  useImagePreloader(imageUrls, {
    timeout: 3000,
    minLoadedPercentage: 70
  });

  const handleUseTemplate = async (template: WorkflowTemplate) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    // Track activity
    try {
      const { clientLogger } = await import('@/lib/logging/client-logger');
      clientLogger.activity({
        activityType: 'template',
        activityName: 'template_selected',
        routeName: 'Templates',
        description: `Selected template: ${template.name}`,
        metadata: {
          template_id: template.id,
          template_name: template.name,
          template_type: template.template_type,
        },
      });
    } catch (err) {
      logger.error('Failed to log template selection activity', err as Error, {
        component: 'Templates',
        operation: 'trackActivity',
        templateId: template.id
      });
      // Don't throw - logging failure shouldn't break template selection
    }

    // Navigate based on template type
    if (template.template_type === 'workflow') {
      navigate(`/dashboard/create-workflow?workflow=${template.id}`);
    } else {
      navigate(`/dashboard/custom-creation?template=${template.id}`);
    }
  };

  const renderCarousel = (categoryTemplates: WorkflowTemplate[], categoryName: string, isFirstCarousel: boolean = false) => {
    if (categoryTemplates.length === 0) return null;

    return (
      <div className="space-y-4 animate-fade-in">
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
                const isPriority = isFirstCarousel;

                return (
                  <CarouselItem key={template.id} className="pl-4 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6">
                    <Card className="group hover:shadow-brutal transition-all overflow-hidden border-2 border-black">
                      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-primary/10 to-accent/10">
                        {signedUrls[template.id]?.before && signedUrls[template.id]?.after ? (
                          <OptimizedBeforeAfterSlider
                            beforeImage={signedUrls[template.id].after!}
                            afterImage={signedUrls[template.id].before!}
                            beforeLabel=""
                            afterLabel=""
                            defaultPosition={25}
                            showHint={true}
                            className="w-full h-full"
                            isSupabaseImage={true}
                            priority={isPriority}
                          />
                        ) : signedUrls[template.id]?.before || signedUrls[template.id]?.after ? (
                          <OptimizedImage
                            src={(signedUrls[template.id]?.after || signedUrls[template.id]?.before)!}
                            alt={template.name || ''}
                            className="w-full h-full object-cover"
                            width={400}
                            height={400}
                            priority={isPriority}
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                            isSupabaseImage={true}
                          />
                        ) : template.thumbnail_url ? (
                          <OptimizedImage
                            src={signedUrls[template.id]?.thumbnail || template.thumbnail_url}
                            alt={template.name || ''}
                            className="w-full h-full object-cover"
                            width={400}
                            height={400}
                            priority={isPriority}
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                            isSupabaseImage={true}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Icon className="h-12 w-12 text-primary/30" />
                          </div>
                        )}
                        <Badge className="absolute top-1 right-1 backdrop-blur-sm bg-secondary text-secondary-foreground font-bold text-xs px-1.5 py-0.5 border border-secondary">
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

      {/* Search & Content Type Filters */}
      <section className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg border-2 border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              />
            </div>
            
            {/* Content Type Filters */}
            <div className="flex flex-wrap gap-2 justify-center">
              <Button
                variant={contentTypeFilter === 'all' ? "default" : "outline"}
                size="sm"
                onClick={() => setContentTypeFilter('all')}
                className="gap-2 border-2"
              >
                <Sparkles className="w-4 h-4" />
                All ({templates.length})
              </Button>
              <Button
                variant={contentTypeFilter === 'image' ? "default" : "outline"}
                size="sm"
                onClick={() => setContentTypeFilter('image')}
                className="gap-2 border-2"
              >
                <ImageIcon className="w-4 h-4" />
                Image ({imageCount})
              </Button>
              <Button
                variant={contentTypeFilter === 'video' ? "default" : "outline"}
                size="sm"
                onClick={() => setContentTypeFilter('video')}
                className="gap-2 border-2"
              >
                <Video className="w-4 h-4" />
                Video ({videoCount})
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Templates Grid */}
      <section className="bg-background">
        <div className="container mx-auto px-4 py-8 md:py-12">
      <LoadingTransition
        isLoading={isLoading && templates.length === 0}
            skeleton={
              <div className="max-w-7xl mx-auto space-y-8">
                <div className="space-y-4">
                  <div className="skeleton h-8 w-48" />
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    <TemplateSkeleton count={6} />
                  </div>
                </div>
              </div>
            }
            transition="fade"
          >
            <div className="max-w-7xl mx-auto space-y-12">
              {productTemplates.length > 0 && (
                <LazyCarousel priority={true}>
                  {renderCarousel(productTemplates, "Product", true)}
                </LazyCarousel>
              )}
              {marketingTemplates.length > 0 && (
                <LazyCarousel priority={productTemplates.length === 0}>
                  {renderCarousel(marketingTemplates, "Marketing", productTemplates.length === 0)}
                </LazyCarousel>
              )}
              {fantasyTemplates.length > 0 && (
                <LazyCarousel>
                  {renderCarousel(fantasyTemplates, "Fantasy")}
                </LazyCarousel>
              )}
              {portraitsTemplates.length > 0 && (
                <LazyCarousel>
                  {renderCarousel(portraitsTemplates, "Portraits")}
                </LazyCarousel>
              )}
              {abstractTemplates.length > 0 && (
                <LazyCarousel>
                  {renderCarousel(abstractTemplates, "Abstract")}
                </LazyCarousel>
              )}
              {fashionTemplates.length > 0 && (
                <LazyCarousel>
                  {renderCarousel(fashionTemplates, "Fashion")}
                </LazyCarousel>
              )}
              {travelTemplates.length > 0 && (
                <LazyCarousel>
                  {renderCarousel(travelTemplates, "Travel")}
                </LazyCarousel>
              )}
              {babyMilestonesTemplates.length > 0 && (
                <LazyCarousel>
                  {renderCarousel(babyMilestonesTemplates, "Baby Milestones")}
                </LazyCarousel>
              )}
              
              {/* Empty State */}
              {filteredTemplates.length === 0 && (
                <div className="text-center py-12">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg text-muted-foreground">No templates found matching your search.</p>
                </div>
              )}

              {templates.length === 0 && (
                <div className="text-center py-12">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No templates available.</p>
                </div>
              )}
            </div>
          </LoadingTransition>
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
