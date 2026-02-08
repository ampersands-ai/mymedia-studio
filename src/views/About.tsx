import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GlobalHeader } from "@/components/GlobalHeader";
import { Footer } from "@/components/Footer";
import { useRouter } from "next/navigation";
import {
  Video,
  Image,
  Music,
  Users,
  DollarSign,
  Zap,
  Layers,
  Heart,
  Mail,
  MapPin,
  Shield
} from "lucide-react";
import { brand, pageTitle, supportMailto, privacyMailto } from '@/config/brand';

const About = () => {
  const router = useRouter();

  useEffect(() => {
    document.title = `${pageTitle('About Us')} | Create Anything. Instantly.`;
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', `${brand.name} provides access to 30+ premium AI models for video, image, audio, and avatar creation—all in one place, at a fraction of the cost.`);
    }
  }, []);

  const modelCategories = [
    {
      icon: Video,
      title: "Video Generation",
      models: ["Veo", "Sora", "Runway", "Kling", "Hailuo", "Wan", "Seedance"],
      color: "bg-primary"
    },
    {
      icon: Image,
      title: "Image Creation",
      models: ["Midjourney", "FLUX", "Ideogram", "Google Imagen", "Seedream", "Grok Imagine", "HiDream", "Qwen", "Recraft"],
      color: "bg-accent"
    },
    {
      icon: Music,
      title: "Audio & Voice",
      models: ["ElevenLabs", "Suno"],
      color: "bg-secondary"
    },
    {
      icon: Users,
      title: "Avatar & Lip-Sync",
      models: ["Kling Avatar", "Infinitalk", "Wan Speech-to-Video"],
      color: "bg-neon-pink"
    }
  ];

  const approachCards = [
    {
      icon: DollarSign,
      title: "Disruptive Pricing",
      description: "We've streamlined operations, optimized infrastructure, and negotiated at scale—so you pay a fraction of what you'd spend subscribing to tools individually."
    },
    {
      icon: Zap,
      title: "No Compromises",
      description: "Same models. Same quality. Lower price. We believe in making advanced AI accessible to all creators."
    },
    {
      icon: Layers,
      title: "Simplicity First",
      description: "No complex learning curves. One platform. One dashboard. One credit system. Create across all formats in minutes."
    },
    {
      icon: Heart,
      title: "Creator-Focused",
      description: "Built for real workflows—whether you're a solo creator, agency, or enterprise team scaling content output."
    }
  ];

  const stats = [
    { value: "30+", label: "AI Models" },
    { value: "5", label: "Pricing Tiers" },
    { value: "2 Weeks", label: "Storage Retention" },
    { value: "0", label: "Hidden Fees" }
  ];

  return (
    <div className="min-h-screen bg-background">
      <GlobalHeader />
      
      <main>
        {/* Hero Section */}
        <section className="relative py-20 md:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center space-y-6">
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-black leading-tight">
                Create Anything.{" "}
                <span className="text-primary">Instantly.</span>{" "}
                <br className="hidden md:block" />
                Without Overpaying.
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
                {brand.name} gives you access to 30+ of the world's most powerful AI models for video,
                image, audio, and avatar creation—all in one place, at a fraction of the cost.
              </p>
            </div>
          </div>
        </section>

        {/* The Problem We Solved */}
        <section className="py-16 md:py-24 bg-card border-y-4 border-black">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-black text-center mb-8">
                The Problem We Solved
              </h2>
              <div className="space-y-6 text-lg text-muted-foreground">
                <p>
                  AI content creation used to mean juggling multiple expensive subscriptions. 
                  Want Sora for video? That's one bill. Need Midjourney for images? Another. 
                  Runway for edits, ElevenLabs for voiceovers—it adds up fast. Creators were 
                  spending $100–$300/month just to access the tools they needed.
                </p>
                <p className="text-foreground font-bold text-xl">
                  {brand.name} changes that.
                </p>
                <p>
                  We've brought together the best AI models under one roof—with unified credits, 
                  one login, and plans starting at just $7.99/month. No more switching tabs, 
                  managing multiple accounts, or paying for features you don't use.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* What Artifio Does */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-5xl font-black text-center mb-4">
              What {brand.name} Does
            </h2>
            <p className="text-xl text-muted-foreground text-center mb-12 max-w-3xl mx-auto">
              One platform. 30+ premium AI models. Unlimited creative possibilities.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {modelCategories.map((category) => (
                <Card key={category.title} className="brutal-card hover-lift">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${category.color}`}>
                        <category.icon className="h-6 w-6 text-black" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-black mb-3">{category.title}</h3>
                        <div className="flex flex-wrap gap-2">
                          {category.models.map((model) => (
                            <span 
                              key={model}
                              className="px-3 py-1 bg-muted rounded-full text-sm font-medium"
                            >
                              {model}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Our Approach */}
        <section className="py-16 md:py-24 bg-card border-y-4 border-black">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-5xl font-black text-center mb-12">
              Our Approach
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {approachCards.map((card) => (
                <Card key={card.title} className="brutal-card text-center">
                  <CardContent className="p-6 space-y-4">
                    <div className="mx-auto w-14 h-14 bg-primary rounded-xl flex items-center justify-center">
                      <card.icon className="h-7 w-7 text-black" />
                    </div>
                    <h3 className="text-lg font-black">{card.title}</h3>
                    <p className="text-sm text-muted-foreground">{card.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* By the Numbers */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-5xl font-black text-center mb-12">
              By the Numbers
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-4xl md:text-5xl font-black text-primary mb-2">
                    {stat.value}
                  </div>
                  <div className="text-muted-foreground font-medium">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Our Commitment */}
        <section className="py-16 md:py-24 bg-card border-y-4 border-black">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center space-y-6">
              <h2 className="text-3xl md:text-5xl font-black">Our Commitment</h2>
              <p className="text-lg text-muted-foreground">
                {brand.name} isn't just a tool—it's a creative partner. We're constantly adding
                new models, refining performance, and expanding capabilities based on user
                feedback. Whether you're creating short-form video, marketing assets, music,
                or AI avatars—we're here to help you do it better, faster, and cheaper.
              </p>
              <Button 
                variant="neon" 
                size="lg" 
                className="font-black text-lg"
                onClick={() => router.push("/pricing")}
              >
                Get Started Today
              </Button>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-5xl font-black text-center mb-12">
              Get in Touch
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <Card className="brutal-card text-center">
                <CardContent className="p-6 space-y-3">
                  <div className="mx-auto w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                    <Mail className="h-6 w-6 text-black" />
                  </div>
                  <h3 className="font-black">Support</h3>
                  <a
                    href={supportMailto()}
                    className="text-primary hover:underline"
                  >
                    {brand.supportEmail}
                  </a>
                </CardContent>
              </Card>
              
              <Card className="brutal-card text-center">
                <CardContent className="p-6 space-y-3">
                  <div className="mx-auto w-12 h-12 bg-accent rounded-xl flex items-center justify-center">
                    <Shield className="h-6 w-6 text-black" />
                  </div>
                  <h3 className="font-black">Privacy</h3>
                  <a
                    href={privacyMailto()}
                    className="text-primary hover:underline"
                  >
                    {brand.privacyEmail}
                  </a>
                </CardContent>
              </Card>
              
              <Card className="brutal-card text-center">
                <CardContent className="p-6 space-y-3">
                  <div className="mx-auto w-12 h-12 bg-secondary rounded-xl flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-black">Location</h3>
                  <p className="text-muted-foreground text-sm">
                    Dallas, TX, USA
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default About;
