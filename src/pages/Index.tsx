import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Video, Image, Music, MessageSquare, Zap, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Video,
      title: "AI Video Generation",
      description: "Transform text into stunning video content in seconds",
      color: "bg-neon-blue",
    },
    {
      icon: Image,
      title: "Image Creation",
      description: "Generate high-quality images from your imagination",
      color: "bg-neon-pink",
    },
    {
      icon: Music,
      title: "Music Composition",
      description: "Create original soundtracks and audio with AI",
      color: "bg-neon-yellow",
    },
    {
      icon: MessageSquare,
      title: "Smart Chat",
      description: "Engage with advanced AI for creative assistance",
      color: "bg-primary",
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
                <img src={logo} alt="Artifio Logo" className="h-10 w-10" />
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
              <img src={logo} alt="Artifio" className="h-6 w-6" />
              <span className="text-sm font-black">POWERED BY ADVANCED AI</span>
            </div>
            <h2 className="text-7xl md:text-8xl font-black leading-tight">
              <span className="gradient-text">ARTIFIO</span>
              <br />
              <span className="block mt-2">"Got an idea?<br/>Just text me."</span>
            </h2>
            <p className="text-xl md:text-2xl text-foreground/80 max-w-3xl mx-auto font-medium">
              Your AI buddy that turns your thoughts into 🔥 text, 🎨 images, 🎵 audio, or 🎬 video — instantly.
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
                <div className="text-3xl font-black">1000+</div>
                <div className="text-sm font-bold">HAPPY USERS</div>
              </div>
              <div className="brutal-card-sm px-6 py-4 bg-primary">
                <div className="text-3xl font-black text-white">INSTANT</div>
                <div className="text-sm font-bold text-white">AI REPLIES</div>
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
            <h3 className="text-5xl font-black mb-4">POWERFUL AI TOOLS</h3>
            <p className="text-xl text-foreground/80 font-medium">
              Everything you need to bring your creative vision to life
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
                  Generate content in seconds with our optimized AI infrastructure
                </p>
              </div>
              
              <div className="text-center space-y-4">
                <div className="h-20 w-20 rounded-full bg-neon-blue border-4 border-black flex items-center justify-center mx-auto brutal-shadow">
                  <Shield className="h-10 w-10 text-white" />
                </div>
                <h4 className="text-3xl font-black">SECURE & PRIVATE</h4>
                <p className="text-foreground/80 font-medium text-lg">
                  Your data is encrypted and never shared. Full privacy guaranteed
                </p>
              </div>
              
              <div className="text-center space-y-4">
                <div className="h-20 w-20 rounded-full bg-neon-pink border-4 border-black flex items-center justify-center mx-auto brutal-shadow p-3">
                  <img src={logo} alt="Premium" className="h-full w-full object-contain" />
                </div>
                <h4 className="text-3xl font-black">PREMIUM QUALITY</h4>
                <p className="text-foreground/80 font-medium text-lg">
                  Professional-grade outputs powered by state-of-the-art AI models
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
                <img src={logo} alt="Artifio" className="h-8 w-8" />
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
