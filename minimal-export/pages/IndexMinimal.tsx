import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { MinimalSidebar } from "@/components/MinimalSidebar";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const IndexMinimal = () => {
  const [currentImage, setCurrentImage] = useState(0);
  
  const portfolioImages = [
    {
      title: "AI Content Generation",
      subtitle: "Text & Image Creation",
      description: "Generate professional content without the chaos"
    },
    {
      title: "Video Production",
      subtitle: "Cinematic Quality",
      description: "Create stunning videos with AI assistance"
    },
    {
      title: "Audio Generation",
      subtitle: "Voice & Music",
      description: "Professional audio content at your fingertips"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % portfolioImages.length);
    }, 5000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Glass Sidebar */}
      <MinimalSidebar />

      {/* Quick Switch Button */}
      <div className="fixed top-6 right-6 z-50">
        <Link href="/">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 backdrop-blur-xl bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Current Design
          </Button>
        </Link>
      </div>

      {/* Hero Section - Full Screen Portfolio Style */}
      <section className="min-h-screen flex items-center justify-center pl-20 relative">
        {/* Background gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black opacity-90 z-0" />
        
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-20 z-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-6xl mx-auto px-8 w-full">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left - Text Content */}
            <div className="space-y-8 animate-fade-in">
              <div className="inline-block px-4 py-2 rounded-full backdrop-blur-xl bg-white/10 border border-white/20 text-white/80 text-sm">
                {portfolioImages[currentImage].subtitle}
              </div>
              
              <h1 className="text-6xl md:text-7xl font-light text-white tracking-tight leading-tight">
                {portfolioImages[currentImage].title}
              </h1>
              
              <p className="text-xl text-white/70 font-light max-w-xl">
                {portfolioImages[currentImage].description}
              </p>

              <div className="pt-4 flex gap-4">
                <Link href="/dashboard/create">
                  <Button
                    size="lg"
                    className="rounded-full px-8 py-6 text-lg font-normal backdrop-blur-xl bg-white text-black hover:bg-white/90 shadow-lg hover:shadow-xl transition-all hover:scale-105"
                  >
                    Start Creating Free
                  </Button>
                </Link>

                <Link href="/features">
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="rounded-full px-8 py-6 text-lg font-normal backdrop-blur-xl bg-white/10 border-white/20 text-white hover:bg-white/20 shadow-lg transition-all"
                  >
                    Learn More
                  </Button>
                </Link>
              </div>

              <p className="text-sm text-white/50 font-light pt-4">
                No credit card required • Cancel anytime
              </p>
            </div>

            {/* Right - Visual Element */}
            <div className="relative h-[600px] animate-fade-in">
              <div className="absolute inset-0 backdrop-blur-xl bg-white/5 rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-transparent to-blue-500/20" />
                <div className="absolute bottom-8 left-8 right-8">
                  <h3 className="text-2xl font-light text-white mb-2">
                    {portfolioImages[currentImage].title.toUpperCase()}
                  </h3>
                  <div className="flex gap-2 mt-4">
                    {portfolioImages.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImage(idx)}
                        className={cn(
                          "h-1 rounded-full transition-all",
                          idx === currentImage 
                            ? "w-12 bg-white" 
                            : "w-8 bg-white/30 hover:bg-white/50"
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section with Glass Cards */}
      <section className="py-32 px-8 pl-28 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-900 to-black" />
        
        <div className="relative z-10 max-w-6xl mx-auto">
          <h2 className="text-5xl font-light text-white text-center mb-16">
            Everything You Need
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "No BS Pricing",
                description: "Simple, transparent pricing. Pay for what you use.",
              },
              {
                title: "Quality Output",
                description: "State-of-the-art AI models. Professional results.",
              },
              {
                title: "Simple to Use",
                description: "Clean interface. No learning curve. Just create.",
              },
            ].map((item, i) => (
              <div 
                key={i}
                className="backdrop-blur-xl bg-white/5 p-8 rounded-3xl border border-white/10 hover:bg-white/10 transition-all hover:-translate-y-2 hover:shadow-2xl group"
              >
                <h3 className="text-2xl font-light text-white mb-4 group-hover:text-purple-300 transition-colors">
                  {item.title}
                </h3>
                <p className="text-white/70 font-light leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-32 px-8 pl-28 relative">
        <div className="absolute inset-0 bg-black" />
        
        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-5xl md:text-6xl font-light text-white">
            Ready to Create Without Chaos?
          </h2>
          
          <Link href="/dashboard/create">
            <Button
              size="lg"
              className="rounded-full px-12 py-7 text-xl font-normal backdrop-blur-xl bg-white text-black hover:bg-white/90 shadow-2xl hover:shadow-purple-500/50 hover:scale-105 transition-all"
            >
              Get Started Free
            </Button>
          </Link>

          <p className="text-sm text-white/50 font-light">
            No credit card required • Cancel anytime
          </p>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="py-12 px-8 pl-28 border-t border-white/10 relative">
        <div className="absolute inset-0 bg-black" />
        
        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-white/50 font-light">
              © 2025 ARTIFIO.AI
            </p>
            
            <div className="flex gap-6 text-sm text-white/60">
              <Link href="/features" className="hover:text-white transition-colors">
                Features
              </Link>
              <Link href="/pricing" className="hover:text-white transition-colors">
                Pricing
              </Link>
              <Link href="/blog" className="hover:text-white transition-colors">
                Blog
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default IndexMinimal;
