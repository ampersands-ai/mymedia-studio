import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GlobalHeader } from "@/components/GlobalHeader";
import { Footer } from "@/components/Footer";
import { useModelsByContentType } from "@/hooks/useModels";
import { 
  Sparkles, 
  Video, 
  Image as ImageIcon, 
  Music, 
  FileText,
  Wand2,
  Zap
} from "lucide-react";

const Features = () => {
  const { modelsByContentType, isLoading } = useModelsByContentType();
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    document.title = "Features - Artifio.ai";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Explore 20+ AI models for video, image, audio, and text generation. All-in-one AI platform with transparent pricing.');
    }
  }, []);

  const categoryIcons: Record<string, any> = {
    video: Video,
    image: ImageIcon,
    audio: Music,
    text: FileText,
  };

  const getContentTypeIcon = (type: string) => {
    const Icon = categoryIcons[type.toLowerCase()] || Sparkles;
    return Icon;
  };

  const allModels = modelsByContentType ? Object.values(modelsByContentType).flat() : [];
  
  const filteredModels = activeTab === "all" 
    ? allModels 
    : modelsByContentType?.[activeTab] || [];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
      <GlobalHeader />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center">
            <Sparkles className="h-16 w-16 mx-auto mb-6 text-primary" />
            <h1 className="text-4xl md:text-6xl font-black mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-gradient">
              All AI Tools in One Place
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground">
              20+ AI models for images, videos, audio, and text
            </p>
          </div>
        </section>

        {/* Features Grid with Tabs */}
        <section className="container mx-auto px-4 py-12 md:py-16">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-6xl mx-auto">
            <TabsList className="grid w-full grid-cols-5 mb-12">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="video">Video</TabsTrigger>
              <TabsTrigger value="image">Image</TabsTrigger>
              <TabsTrigger value="audio">Audio</TabsTrigger>
              <TabsTrigger value="text">Text</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-8">
              {isLoading ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Loading features...</p>
                </div>
              ) : filteredModels.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No models found in this category.</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredModels.map((model) => {
                    const Icon = getContentTypeIcon(model.content_type);
                    return (
                      <Card key={model.record_id} className="hover:border-primary transition-colors">
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4 mb-4">
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0 p-2">
                              {model.logo_url ? (
                                <img 
                                  src={model.logo_url} 
                                  alt={model.model_name}
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <Icon className="h-6 w-6 text-primary" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-lg mb-1 truncate">{model.model_name}</h3>
                              <p className="text-xs text-muted-foreground">
                                {model.provider}
                              </p>
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Base cost:</span>
                              <span className="font-semibold">{model.base_token_cost} credits</span>
                            </div>
                            
                            {model.estimated_time_seconds && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Est. time:</span>
                                <span className="font-semibold">~{model.estimated_time_seconds}s</span>
                              </div>
                            )}
                            
                            <Button asChild className="w-full mt-4" variant="outline">
                              <Link to="/dashboard/custom-creation">Try Now</Link>
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

        {/* Feature Highlights */}
        <section className="container mx-auto px-4 py-12 md:py-16">
          <h2 className="text-3xl md:text-4xl font-black text-center mb-12">Why Artifio?</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <Card>
              <CardContent className="p-6 text-center">
                <Wand2 className="h-10 w-10 mx-auto mb-4 text-primary" />
                <h3 className="text-xl font-bold mb-2">All-in-One Platform</h3>
                <p className="text-muted-foreground">
                  Access 20+ AI models from leading providers. No need to manage multiple subscriptions.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Zap className="h-10 w-10 mx-auto mb-4 text-primary" />
                <h3 className="text-xl font-bold mb-2">Transparent Pricing</h3>
                <p className="text-muted-foreground">
                  Know exactly what you'll pay before you create. Simple credit-based pricing with no hidden fees.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Sparkles className="h-10 w-10 mx-auto mb-4 text-primary" />
                <h3 className="text-xl font-bold mb-2">Professional Quality</h3>
                <p className="text-muted-foreground">
                  State-of-the-art AI models deliver stunning results for your creative projects.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-16 md:py-24">
          <Card className="max-w-2xl mx-auto border-4 border-primary">
            <CardContent className="p-8 md:p-12 text-center">
              <h2 className="text-3xl md:text-4xl font-black mb-4">Ready to Create?</h2>
              <p className="text-lg text-muted-foreground mb-6">
                Start exploring all our AI features today
              </p>
              <Button asChild size="lg" variant="neon">
                <Link to="/dashboard/custom-creation">Start Creating</Link>
              </Button>
              <p className="text-sm text-muted-foreground mt-4">
                5 free credits • No credit card required
              </p>
            </CardContent>
          </Card>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Features;
