import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Video, Image, Music, MessageSquare, Zap, Shield, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Video,
      title: "AI Video Generation",
      description: "Veo 3, Veo 3 Fast, Runway, Luma - Create stunning videos with synchronized audio",
      color: "bg-neon-blue",
      models: "Veo 3 • Runway • Luma",
    },
    {
      icon: Image,
      title: "Image Creation",
      description: "GPT-Image-1, Midjourney V7, Flux - Generate high-quality images from text or images",
      color: "bg-neon-pink",
      models: "4o Image • Midjourney • Flux",
    },
    {
      icon: Music,
      title: "Music & Audio",
      description: "Suno API - Create original soundtracks, convert speech to text, and generate voice",
      color: "bg-neon-yellow",
      models: "Suno • TTS • STT",
    },
    {
      icon: MessageSquare,
      title: "Multi-Modal AI",
      description: "Text to Video, Image to Video, Image Editing, and advanced AI capabilities",
      color: "bg-primary",
      models: "All in One API",
    },
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
            <h2 className="text-7xl md:text-8xl font-black leading-tight">
              <span className="gradient-text">ARTIFIO</span>
              <br />
              <span className="block mt-2">"Got an idea?<br/>Just text me."</span>
            </h2>
            <p className="text-xl md:text-2xl text-foreground/80 max-w-3xl mx-auto font-medium">
              Access Veo 3, Runway, Midjourney, GPT-Image-1, Suno, and more—all in one platform. Create 🎬 videos, 🎨 images, 🎵 music instantly.
            </p>
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button
                variant="neon"
                size="lg"
                onClick={() => navigate("/auth")}
                className="text-xl px-12"
              >
                START CREATING FREE
              </Button>
              <Button
                variant="pink"
                size="lg"
                onClick={() => navigate("/playground")}
                className="text-xl px-12"
              >
                TRY PLAYGROUND
              </Button>
            </div>
            <div className="flex items-center justify-center gap-8 pt-8">
              <div className="brutal-card-sm px-6 py-4 bg-neon-blue">
                <div className="text-3xl font-black">10,000+</div>
                <div className="text-sm font-bold">DAILY CALLS</div>
              </div>
              <div className="brutal-card-sm px-6 py-4 bg-primary">
                <div className="text-3xl font-black text-white">99.9%</div>
                <div className="text-sm font-bold text-white">UPTIME</div>
              </div>
            </div>
            <p className="text-base font-bold pt-4">
              🎉 New users get 500 free tokens • No credit card required
            </p>
          </div>
        </section>

        {/* Features Grid */}
        <section className="container mx-auto px-4 py-20">
          <div className="text-center mb-16">
            <h3 className="text-5xl font-black mb-4">AVAILABLE AI MODELS</h3>
            <p className="text-xl text-foreground/80 font-medium">
              Access the best AI models through one unified API
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="hover-lift cursor-pointer">
                  <CardContent className="p-8 space-y-4">
                    <div className={`h-16 w-16 rounded-2xl ${feature.color} border-4 border-black flex items-center justify-center brutal-shadow`}>
                      <Icon className="h-8 w-8 text-black" />
                    </div>
                    <h4 className="text-2xl font-black">{feature.title}</h4>
                    <p className="text-foreground/80 font-medium">{feature.description}</p>
                    <div className="pt-2 text-xs font-black text-foreground/60 uppercase">
                      {feature.models}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Why Choose Section */}
        <section className="container mx-auto px-4 py-20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h3 className="text-5xl font-black mb-4">WHY CHOOSE ARTIFIO</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center space-y-4">
                <div className="h-20 w-20 rounded-full bg-neon-yellow border-4 border-black flex items-center justify-center mx-auto brutal-shadow">
                  <Zap className="h-10 w-10 text-black" />
                </div>
                <h4 className="text-3xl font-black">LIGHTNING FAST</h4>
                <p className="text-foreground/80 font-medium text-lg">
                  Average 25.2s response time with 99.9% uptime guarantee
                </p>
              </div>
              
              <div className="text-center space-y-4">
                <div className="h-20 w-20 rounded-full bg-neon-blue border-4 border-black flex items-center justify-center mx-auto brutal-shadow">
                  <Shield className="h-10 w-10 text-white" />
                </div>
                <h4 className="text-3xl font-black">SECURE & RELIABLE</h4>
                <p className="text-foreground/80 font-medium text-lg">
                  #1 data security, 24/7 support, and enterprise-grade infrastructure
                </p>
              </div>
              
              <div className="text-center space-y-4">
                <div className="h-20 w-20 rounded-full bg-neon-pink border-4 border-black flex items-center justify-center mx-auto brutal-shadow">
                  <Sparkles className="h-10 w-10 text-white" />
                </div>
                <h4 className="text-3xl font-black">ALL-IN-ONE API</h4>
                <p className="text-foreground/80 font-medium text-lg">
                  70% cheaper than Fal & Replicate—access all top models in one place
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-20">
          <Card className="p-16 text-center max-w-5xl mx-auto bg-gradient-primary hover-lift">
            <div className="space-y-8">
              <h3 className="text-5xl font-black text-white">READY TO CREATE?</h3>
              <p className="text-2xl text-white/90 font-medium">
                Join thousands of creators using Artifio to bring their ideas to life
              </p>
              <Button
                variant="neon"
                size="lg"
                onClick={() => navigate("/auth")}
                className="text-xl px-16"
              >
                START FREE WITH 500 TOKENS
              </Button>
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
