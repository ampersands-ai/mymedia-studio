import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { GlobalHeader } from "@/components/GlobalHeader";
import { Footer } from "@/components/Footer";
import { useTemplatesByCategory } from "@/hooks/useTemplates";
import { Sparkles, Image as ImageIcon, Video, Music, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Templates = () => {
  const { templatesByCategory, templates, isLoading } = useTemplatesByCategory();
  const [activeTab, setActiveTab] = useState("all");
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Templates - Artifio.ai";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Ready-to-use AI templates for videos, images, audio, and text. Start creating in seconds with professional templates.');
    }
  }, []);

  const categoryIcons: Record<string, any> = {
    "Video Creation": Video,
    "Image Generation": ImageIcon,
    "Portrait Headshots": ImageIcon,
    "Product Photos": ImageIcon,
    "Social Media Content": ImageIcon,
    "Audio Processing": Music,
    "Text Generation": FileText,
    "Creative Design": Sparkles,
    "Photo Editing": ImageIcon,
  };

  const getTemplateIcon = (category: string) => {
    return categoryIcons[category] || Sparkles;
  };

  const allTemplates = templates || [];
  const filteredTemplates = activeTab === "all"
    ? allTemplates
    : allTemplates.filter(t => {
        const contentType = t.ai_models?.content_type?.toLowerCase();
        return contentType === activeTab;
      });

  const handleUseTemplate = (templateId: string) => {
    navigate(`/dashboard/create?template=${templateId}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
      <GlobalHeader />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center">
            <Sparkles className="h-16 w-16 mx-auto mb-6 text-primary" />
            <h1 className="text-4xl md:text-6xl font-black mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-gradient">
              Ready-to-Use Templates
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground">
              Start creating in seconds with our professional templates
            </p>
          </div>
        </section>

        {/* Templates Grid with Tabs */}
        <section className="container mx-auto px-4 py-12 md:py-16">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-6xl mx-auto">
            <TabsList className="grid w-full grid-cols-5 mb-12">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="image">Image</TabsTrigger>
              <TabsTrigger value="video">Video</TabsTrigger>
              <TabsTrigger value="audio">Audio</TabsTrigger>
              <TabsTrigger value="text">Text</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-8">
              {isLoading ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Loading templates...</p>
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No templates found in this category.</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTemplates.map((template) => {
                    const Icon = getTemplateIcon(template.category);
                    return (
                      <Card key={template.id} className="hover:border-primary transition-colors overflow-hidden">
                        <div className="aspect-video bg-gradient-to-br from-primary/20 via-accent/20 to-primary/20 flex items-center justify-center">
                          {template.thumbnail_url ? (
                            <img 
                              src={template.thumbnail_url} 
                              alt={template.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Icon className="h-16 w-16 text-primary" />
                          )}
                        </div>
                        <CardContent className="p-6">
                          <div className="space-y-3">
                            <div>
                              <Badge variant="secondary" className="mb-2">
                                {template.category}
                              </Badge>
                              <h3 className="font-bold text-lg">{template.name}</h3>
                              {template.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {template.description}
                                </p>
                              )}
                            </div>
                            
                            {template.ai_models && (
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{template.ai_models.model_name}</span>
                                <span>{template.ai_models.base_token_cost} tokens</span>
                              </div>
                            )}
                            
                            {template.estimated_time_seconds && (
                              <div className="text-xs text-muted-foreground">
                                Est. time: ~{template.estimated_time_seconds}s
                              </div>
                            )}
                            
                            <Button 
                              className="w-full mt-4" 
                              variant="default"
                              onClick={() => handleUseTemplate(template.id)}
                            >
                              Use Template
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-16 md:py-24">
          <Card className="max-w-2xl mx-auto border-4 border-primary">
            <CardContent className="p-8 md:p-12 text-center">
              <h2 className="text-3xl md:text-4xl font-black mb-4">Can't Find What You Need?</h2>
              <p className="text-lg text-muted-foreground mb-6">
                Explore all our AI models for custom creations
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" variant="neon">
                  <a href="/dashboard/create">Start Creating</a>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <a href="/features">View All Features</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Templates;
