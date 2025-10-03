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
    },
    {
      icon: Image,
      title: "Image Creation",
      description: "Generate high-quality images from your imagination",
    },
    {
      icon: Music,
      title: "Music Composition",
      description: "Create original soundtracks and audio with AI",
    },
    {
      icon: MessageSquare,
      title: "Smart Chat",
      description: "Engage with advanced AI for creative assistance",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,hsl(270_80%_65%/0.15),transparent_70%)]" />
      
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-border/50 backdrop-blur-xl bg-background/50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={logo} alt="Artifio Logo" className="h-8 w-8" />
                <h1 className="text-2xl font-bold glow-text">Artifio.ai</h1>
              </div>
              <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => navigate("/pricing")}>
                  Pricing
                </Button>
                <Button variant="outline" onClick={() => navigate("/auth")}>
                  Sign In
                </Button>
                <Button
                  onClick={() => navigate("/auth")}
                  className="bg-gradient-primary hover:opacity-90"
                >
                  Get Started
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="container mx-auto px-4 py-24">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <img src={logo} alt="Artifio" className="h-5 w-5" />
              <span className="text-sm font-medium">Powered by Advanced AI</span>
            </div>
            <h2 className="text-6xl md:text-7xl font-bold leading-tight">
              Create Anything
              <br />
              <span className="glow-text">With AI Magic</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Transform your ideas into reality with our cutting-edge AI platform.
              Generate videos, images, music, and more—all in one place.
            </p>
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="bg-gradient-primary hover:opacity-90 text-lg px-8 animate-glow"
              >
                Start Creating Free
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/playground")}
              >
                Try Playground
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              🎉 New users get 500 free tokens • No credit card required
            </p>
          </div>
        </section>

        {/* Features Grid */}
        <section className="container mx-auto px-4 py-24">
          <div className="text-center mb-12">
            <h3 className="text-4xl font-bold mb-4">Powerful AI Tools</h3>
            <p className="text-muted-foreground text-lg">
              Everything you need to bring your creative vision to life
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="glass-card hover:glow-border transition-all group">
                  <CardContent className="p-6 space-y-4">
                    <div className="h-12 w-12 rounded-lg bg-gradient-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h4 className="text-xl font-semibold">{feature.title}</h4>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Why Choose Section */}
        <section className="container mx-auto px-4 py-24">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h3 className="text-4xl font-bold mb-4">Why Choose Artifio</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-gradient-primary flex items-center justify-center mx-auto">
                  <Zap className="h-8 w-8" />
                </div>
                <h4 className="text-2xl font-semibold">Lightning Fast</h4>
                <p className="text-muted-foreground">
                  Generate content in seconds with our optimized AI infrastructure
                </p>
              </div>
              
              <div className="text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-gradient-primary flex items-center justify-center mx-auto">
                  <Shield className="h-8 w-8" />
                </div>
                <h4 className="text-2xl font-semibold">Secure & Private</h4>
                <p className="text-muted-foreground">
                  Your data is encrypted and never shared. Full privacy guaranteed
                </p>
              </div>
              
              <div className="text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-gradient-primary flex items-center justify-center mx-auto p-3">
                  <img src={logo} alt="Premium" className="h-full w-full object-contain" />
                </div>
                <h4 className="text-2xl font-semibold">Premium Quality</h4>
                <p className="text-muted-foreground">
                  Professional-grade outputs powered by state-of-the-art AI models
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-24">
          <Card className="glass-card glow-border p-12 text-center max-w-4xl mx-auto">
            <div className="space-y-6">
              <h3 className="text-4xl font-bold">Ready to Create?</h3>
              <p className="text-xl text-muted-foreground">
                Join thousands of creators using Artifio to bring their ideas to life
              </p>
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="bg-gradient-primary hover:opacity-90 text-lg px-12"
              >
                Start Free with 500 Tokens
              </Button>
            </div>
          </Card>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/50 backdrop-blur-xl bg-background/50">
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={logo} alt="Artifio" className="h-6 w-6" />
                <span className="font-semibold">Artifio.ai</span>
              </div>
              <p className="text-sm text-muted-foreground">
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
