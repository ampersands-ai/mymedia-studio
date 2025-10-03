import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Zap, Shield, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import portraitHeadshots from "@/assets/portrait-headshots.jpg";
import photoEditing from "@/assets/photo-editing.jpg";
import videoCreation from "@/assets/video-creation.jpg";
import productPhotos from "@/assets/product-photos.jpg";
import socialMedia from "@/assets/social-media.jpg";
import creativeDesign from "@/assets/creative-design.jpg";
import audioProcessing from "@/assets/audio-processing.jpg";
import textGeneration from "@/assets/text-generation.jpg";

const Index = () => {
  const navigate = useNavigate();

  const useCases = [
    {
      title: "Portrait Headshots",
      description: "Professional AI-generated headshots for business profiles and portfolios",
      image: portraitHeadshots,
      category: "Image Creation",
    },
    {
      title: "Photo Editing",
      description: "Enhance, retouch, and perfect your images with AI-powered editing tools",
      image: photoEditing,
      category: "Image Editing",
    },
    {
      title: "Cinematic Videos",
      description: "Create stunning videos with professional effects and transitions",
      image: videoCreation,
      category: "Video Generation",
    },
    {
      title: "Product Photography",
      description: "Generate perfect product shots for e-commerce and marketing",
      image: productPhotos,
      category: "E-commerce",
    },
    {
      title: "Social Media Content",
      description: "Design engaging posts, stories, and ads for all platforms",
      image: socialMedia,
      category: "Marketing",
    },
    {
      title: "Creative Design",
      description: "Bring your artistic vision to life with AI-powered design tools",
      image: creativeDesign,
      category: "Creative",
    },
    {
      title: "Audio Processing",
      description: "Generate music, voiceovers, and process audio with AI",
      image: audioProcessing,
      category: "Audio",
    },
    {
      title: "Text Generation",
      description: "Create compelling content, documents, and copy instantly",
      image: textGeneration,
      category: "Text Processing",
    },
  ];

  const capabilities = [
    "Remove Backgrounds",
    "Photo Enhancing",
    "Product Videos",
    "Document Processing",
    "Web & Link Processing",
    "Multi-Language Support",
    "Educational Content",
    "Business & Professional",
    "Location & Travel",
    "Branding & Identity",
    "Family & Entertainment",
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b-4 border-black bg-card">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-primary border-3 border-black brutal-shadow flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-3xl font-black gradient-text">ARTIFIO.AI</h1>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={() => navigate("/pricing")}>
                  Pricing
                </Button>
                <Button variant="outline" onClick={() => navigate("/auth")}>
                  Sign In
                </Button>
                <Button
                  variant="neon"
                  size="lg"
                  onClick={() => navigate("/auth")}
                >
                  Get Started
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="container mx-auto px-4 py-20">
          <div className="max-w-5xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-neon-yellow border-4 border-black brutal-shadow mb-4">
              <Sparkles className="h-5 w-5" />
              <span className="text-sm font-black">POWERED BY ADVANCED AI</span>
            </div>
            <h2 className="text-6xl md:text-7xl font-black leading-tight">
              <span className="gradient-text">Create Anything</span>
              <br />
              <span className="block mt-2">Your Imagination Can Dream</span>
            </h2>
            <p className="text-xl md:text-2xl text-foreground/80 max-w-3xl mx-auto font-medium">
              From professional headshots to cinematic videos, from product photography to social media content—
              <span className="font-black gradient-text"> create it all in seconds with AI</span>
            </p>
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button
                variant="neon"
                size="lg"
                onClick={() => navigate("/auth")}
                className="text-xl px-12"
              >
                START FOR FREE
              </Button>
              <Button
                variant="pink"
                size="lg"
                onClick={() => navigate("/playground")}
                className="text-xl px-12"
              >
                EXPLORE NOW
              </Button>
            </div>
            <div className="flex items-center justify-center gap-8 pt-8">
              <div className="brutal-card-sm px-6 py-4 bg-neon-blue">
                <div className="text-3xl font-black">500</div>
                <div className="text-sm font-bold">FREE TOKENS</div>
              </div>
              <div className="brutal-card-sm px-6 py-4 bg-primary">
                <div className="text-3xl font-black text-white">NO CC</div>
                <div className="text-sm font-bold text-white">REQUIRED</div>
              </div>
            </div>
            <p className="text-base font-bold pt-4">
              🎉 No credit card • Start creating immediately
            </p>
          </div>
        </section>

        {/* Use Cases Grid */}
        <section className="container mx-auto px-4 py-20">
          <div className="text-center mb-16">
            <h3 className="text-5xl font-black mb-4">WHAT YOU CAN CREATE</h3>
            <p className="text-xl text-foreground/80 font-medium max-w-3xl mx-auto">
              Professional-grade AI tools for every creative need—no experience required
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {useCases.map((useCase) => (
              <Card key={useCase.title} className="hover-lift cursor-pointer overflow-hidden group">
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src={useCase.image} 
                    alt={useCase.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute top-3 right-3 bg-neon-yellow px-3 py-1 rounded-full border-2 border-black text-xs font-black">
                    {useCase.category}
                  </div>
                </div>
                <CardContent className="p-6 space-y-2">
                  <h4 className="text-xl font-black">{useCase.title}</h4>
                  <p className="text-foreground/80 font-medium text-sm">{useCase.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* More Capabilities */}
        <section className="container mx-auto px-4 py-20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h3 className="text-4xl font-black mb-4">AND SO MUCH MORE</h3>
              <p className="text-lg text-foreground/80 font-medium">
                Explore our complete suite of AI-powered capabilities
              </p>
            </div>
            
            <div className="flex flex-wrap gap-3 justify-center">
              {capabilities.map((capability) => (
                <div
                  key={capability}
                  className="brutal-card-sm px-5 py-3 bg-card hover-lift cursor-pointer"
                >
                  <span className="font-bold text-sm">{capability}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why Choose Section */}
        <section className="container mx-auto px-4 py-20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h3 className="text-5xl font-black mb-4">WHY ARTIFIO</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center space-y-4">
                <div className="h-20 w-20 rounded-full bg-neon-yellow border-4 border-black flex items-center justify-center mx-auto brutal-shadow">
                  <Zap className="h-10 w-10 text-black" />
                </div>
                <h4 className="text-3xl font-black">INSTANT RESULTS</h4>
                <p className="text-foreground/80 font-medium text-lg">
                  No waiting, no rendering queues—your creations are ready in seconds
                </p>
              </div>
              
              <div className="text-center space-y-4">
                <div className="h-20 w-20 rounded-full bg-neon-blue border-4 border-black flex items-center justify-center mx-auto brutal-shadow">
                  <Shield className="h-10 w-10 text-white" />
                </div>
                <h4 className="text-3xl font-black">ENTERPRISE GRADE</h4>
                <p className="text-foreground/80 font-medium text-lg">
                  99.9% uptime with bank-level security and 24/7 support
                </p>
              </div>
              
              <div className="text-center space-y-4">
                <div className="h-20 w-20 rounded-full bg-neon-pink border-4 border-black flex items-center justify-center mx-auto brutal-shadow">
                  <Sparkles className="h-10 w-10 text-white" />
                </div>
                <h4 className="text-3xl font-black">NO EXPERIENCE NEEDED</h4>
                <p className="text-foreground/80 font-medium text-lg">
                  Just describe what you want—our AI handles all the technical details
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-20">
          <Card className="p-16 text-center max-w-5xl mx-auto bg-gradient-primary hover-lift">
            <div className="space-y-8">
              <h3 className="text-5xl font-black text-white">START CREATING TODAY</h3>
              <p className="text-2xl text-white/90 font-medium">
                Join thousands of creators bringing their ideas to life with AI
              </p>
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="neon"
                  size="lg"
                  onClick={() => navigate("/auth")}
                  className="text-xl px-16"
                >
                  GET 500 FREE TOKENS
                </Button>
              </div>
              <p className="text-white/80 font-medium">
                No credit card required • Start in 30 seconds
              </p>
            </div>
          </Card>
        </section>

        {/* Footer */}
        <footer className="border-t-4 border-black bg-card">
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-primary border-2 border-black brutal-shadow flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <span className="font-black text-xl">ARTIFIO.AI</span>
              </div>
              <p className="text-sm font-medium text-foreground/60">
                © 2025 Artifio. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Index;
