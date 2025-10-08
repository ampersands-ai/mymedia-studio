import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Zap, Shield, Sparkles } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Footer } from "@/components/Footer";
import { generateSchemas, injectSchemas } from "@/lib/seo-schemas";
import portraitHeadshots from "@/assets/portrait-headshots.jpg";
import photoEditing from "@/assets/photo-editing.jpg";
import videoCreation from "@/assets/video-creation.jpg";
import productPhotos from "@/assets/product-photos.jpg";
import socialMedia from "@/assets/social-media.jpg";
import creativeDesign from "@/assets/creative-design.jpg";
import audioProcessing from "@/assets/audio-processing.jpg";
import textGeneration from "@/assets/text-generation.jpg";
import logo from "@/assets/logo.png";
import textLogo from "@/assets/text-logo.png";
import recraftLogo from "@/assets/partners/recraft.png";
import lumaLogo from "@/assets/partners/luma.jpg";
import klingLogo from "@/assets/partners/kling.png";
import bytedanceLogo from "@/assets/partners/bytedance.png";
import wanLogo from "@/assets/partners/wan.png";
import sora2Logo from "@/assets/partners/sora2.jpg";
import elevenlabsLogo from "@/assets/partners/elevenlabs.png";
import veo3Logo from "@/assets/partners/veo3.png";
import runwayLogo from "@/assets/partners/runway.png";
import geminiLogo from "@/assets/partners/gemini.png";
import midjourneyLogo from "@/assets/partners/midjourney.jpg";
import openaiLogo from "@/assets/partners/openai.png";
import chatgptLogo from "@/assets/partners/chatgpt.png";
import hailuoLogo from "@/assets/partners/hailuo.png";
import seedanceLogo from "@/assets/partners/seedance.png";
import googleLogo from "@/assets/partners/google.webp";
import googleAILogo from "@/assets/partners/google-ai.png";
import topazLogo from "@/assets/partners/topaz.webp";
import blackforestLogo from "@/assets/partners/blackforest.svg";
import claudeLogo from "@/assets/partners/claude.svg";
import sunoLogo from "@/assets/partners/suno.svg";
import ideogramLogo from "@/assets/partners/ideogram.png";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Defer SEO schema injection for better LCP performance
  useEffect(() => {
    // Defer schema injection to after initial render
    const timer = setTimeout(() => {
      const schemas = generateSchemas();
      injectSchemas(schemas);
      
      // Update meta tags
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', 
          'Professional AI-powered platform for creating videos, images, music, and more. Generate portrait headshots, cinematic videos, product photography, and social media content instantly. Start free with 500 tokens.'
        );
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

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

  const partners = [
    { name: "Claude", logo: claudeLogo },
    { name: "Midjourney", logo: midjourneyLogo },
    { name: "Veo 3", logo: veo3Logo },
    { name: "Suno", logo: sunoLogo },
    { name: "Gemini", logo: geminiLogo },
    { name: "Black Forest Labs", logo: blackforestLogo },
    { name: "Runway", logo: runwayLogo },
    { name: "ElevenLabs", logo: elevenlabsLogo },
    { name: "Kling", logo: klingLogo },
    { name: "ChatGPT", logo: chatgptLogo },
    { name: "Ideogram", logo: ideogramLogo },
    { name: "Luma", logo: lumaLogo },
    { name: "Sora 2", logo: sora2Logo },
    { name: "Recraft", logo: recraftLogo },
    { name: "ByteDance", logo: bytedanceLogo },
    { name: "Google AI", logo: googleAILogo },
    { name: "Hailuo", logo: hailuoLogo },
    { name: "OpenAI", logo: openaiLogo },
    { name: "Topaz Labs", logo: topazLogo },
    { name: "Wan", logo: wanLogo },
    { name: "Seedance", logo: seedanceLogo },
    { name: "Google", logo: googleLogo },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b-4 border-black bg-card">
          <nav className="container mx-auto px-4 py-3 md:py-4" aria-label="Main navigation">
            <div className="flex items-center justify-between">
              <Link to="/" className="flex items-center gap-2 md:gap-3 hover:opacity-80 transition-opacity">
                <img 
                  src={logo} 
                  alt="Artifio.ai logo symbol" 
                  className="h-8 w-8 md:h-10 md:w-10 rounded-xl border-3 border-black brutal-shadow"
                  loading="eager"
                />
                <img 
                  src={textLogo} 
                  alt="Artifio" 
                  className="h-6 md:h-8"
                  loading="eager"
                />
              </Link>
              <div className="flex items-center gap-2 md:gap-3">
                <Button variant="ghost" onClick={() => navigate("/pricing")} className="text-sm md:text-base px-2 md:px-4">
                  Pricing
                </Button>
                {!user ? (
                  <>
                    <Button variant="outline" onClick={() => navigate("/auth")} className="hidden sm:inline-flex text-sm md:text-base">
                      Sign In
                    </Button>
                    <Button
                      variant="neon"
                      size="sm"
                      onClick={() => navigate("/auth")}
                      className="md:text-base"
                    >
                      Get Started
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="neon"
                    size="sm"
                    onClick={() => navigate("/dashboard/custom-creation")}
                    className="md:text-base"
                  >
                    Go to Dashboard
                  </Button>
                )}
              </div>
            </div>
          </nav>
        </header>

        {/* Hero Section */}
        <section className="container mx-auto px-4 py-12 md:py-20">
          <div className="max-w-5xl mx-auto text-center space-y-6 md:space-y-8">
            <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 mb-2 md:mb-4">
              <div className="inline-flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 rounded-full bg-neon-yellow border-3 md:border-4 border-black brutal-shadow">
                <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-black" aria-hidden="true" />
                <span className="text-xs md:text-sm font-black text-black">POWERED BY ADVANCED AI</span>
              </div>
              <div className="inline-flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 rounded-full bg-secondary border-3 md:border-4 border-black brutal-shadow">
                <span className="text-xs md:text-sm font-black text-black">🎯 SAVE 50-80% VS COMPETITORS</span>
              </div>
              <div className="inline-flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 rounded-full bg-primary border-3 md:border-4 border-black brutal-shadow">
                <span className="text-xs md:text-sm font-black text-primary-foreground">💎 ENTERPRISE POWER, FREELANCER PRICES</span>
              </div>
            </div>
            <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-tight px-4">
              <span className="gradient-text">An Affordable</span>
              <br />
              <span className="block mt-2">AI Creation Platform</span>
            </h2>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-foreground/80 max-w-3xl mx-auto font-medium px-4">
              Why pay $50-100/month elsewhere? Create stunning videos, images, music & text for a fraction of the cost—
              <span className="font-black gradient-text"> starting at just $3.99/mo</span>
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 pt-4 px-4">
              <Button
                variant="neon"
                size="lg"
                onClick={() => navigate("/auth")}
                className="w-full sm:w-auto text-base md:text-xl px-8 md:px-12"
              >
                START CREATING FOR FREE
              </Button>
              <Button
                variant="pink"
                size="lg"
                onClick={() => navigate("/pricing")}
                className="w-full sm:w-auto text-base md:text-xl px-8 md:px-12"
              >
                SEE HOW MUCH YOU'LL SAVE
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-8 pt-6 md:pt-8">
              <div className="brutal-card-sm px-6 md:px-8 py-3 md:py-4 bg-neon-blue">
                <div className="text-2xl md:text-3xl font-black text-black">500</div>
                <div className="text-xs md:text-sm font-bold text-black">FREE TOKENS</div>
              </div>
              <div className="brutal-card-sm px-6 md:px-8 py-3 md:py-4 bg-neon-pink">
                <div className="text-2xl md:text-3xl font-black text-white">NO CC</div>
                <div className="text-xs md:text-sm font-bold text-white">REQUIRED</div>
              </div>
            </div>
            <p className="text-sm md:text-base font-bold pt-4">
              🎉 No credit card • Start creating immediately
            </p>
            <p className="text-base md:text-lg font-black pt-2 gradient-text">
              💰 Generate high quality content for less • More affordable than competitors
            </p>
          </div>
        </section>

        {/* Technology Partners */}
        <section className="py-12 md:py-16 bg-card/30 overflow-hidden">
          <div className="container mx-auto px-4 mb-8">
            <h3 className="text-2xl md:text-3xl font-black text-center">TECHNOLOGY PARTNERS</h3>
          </div>
          <div className="relative w-full overflow-hidden">
            <div className="flex gap-2 md:gap-8 partners-track">
              {/* First set of partners */}
              {partners.map((partner, index) => (
                <div
                  key={`logo-${index}`}
                  className="flex-shrink-0 w-16 h-10 md:w-32 md:h-16 flex items-center justify-center"
                >
                  <img
                    src={partner.logo}
                    alt={`${partner.name} logo`}
                    className="max-h-full max-w-full object-contain opacity-70 hover:opacity-100 transition-opacity"
                    loading="lazy"
                  />
                </div>
              ))}
              {/* Second set for seamless loop */}
              {partners.map((partner, index) => (
                <div
                  key={`logo-duplicate-${index}`}
                  className="flex-shrink-0 w-16 h-10 md:w-32 md:h-16 flex items-center justify-center"
                  aria-hidden="true"
                >
                  <img
                    src={partner.logo}
                    alt={`${partner.name} logo`}
                    className="max-h-full max-w-full object-contain opacity-70 hover:opacity-100 transition-opacity"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Use Cases Grid */}
        <section className="container mx-auto px-4 py-12 md:py-20">
          <div className="text-center mb-8 md:mb-16">
            <h3 className="text-3xl sm:text-4xl md:text-5xl font-black mb-3 md:mb-4 px-4">WHAT YOU CAN CREATE</h3>
            <p className="text-base md:text-xl text-foreground/80 font-medium max-w-3xl mx-auto px-4">
              Professional-grade AI tools for every creative need—no experience required
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-7xl mx-auto">
            {useCases.map((useCase) => (
              <article key={useCase.title} className="hover-lift cursor-pointer">
                <Card className="overflow-hidden group h-full">
                  <div className="relative h-40 sm:h-48 overflow-hidden">
                    <img 
                      src={useCase.image} 
                      alt={`${useCase.title} - ${useCase.description}`}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      loading="lazy"
                      width="400"
                      height="300"
                    />
                    <div className="absolute top-2 md:top-3 right-2 md:right-3 bg-neon-yellow px-2 md:px-3 py-1 rounded-full border-2 border-black text-xs font-black text-black">
                      {useCase.category}
                    </div>
                  </div>
                  <CardContent className="p-4 md:p-6 space-y-2">
                    <h4 className="text-lg md:text-xl font-black">{useCase.title}</h4>
                    <p className="text-foreground/80 font-medium text-sm">{useCase.description}</p>
                  </CardContent>
                </Card>
              </article>
            ))}
          </div>
        </section>

        {/* More Capabilities */}
        <section className="container mx-auto px-4 py-12 md:py-20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 md:mb-12">
              <h3 className="text-3xl md:text-4xl font-black mb-3 md:mb-4 px-4">AND SO MUCH MORE</h3>
              <p className="text-base md:text-lg text-foreground/80 font-medium px-4">
                Explore our complete suite of AI-powered capabilities
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2 md:gap-3 justify-center">
              {capabilities.map((capability) => (
                <div
                  key={capability}
                  className="brutal-card-sm px-3 md:px-5 py-2 md:py-3 bg-card hover-lift cursor-pointer"
                >
                  <span className="font-bold text-xs md:text-sm">{capability}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Savings Comparison */}
        <section className="container mx-auto px-4 py-12 md:py-20 bg-card/30">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8 md:mb-12">
              <h3 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 px-4">COMPARE & SAVE</h3>
              <p className="text-lg md:text-xl text-foreground/80 font-medium px-4">
                See how much you save with Artifio.ai vs leading competitors
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <Card className="brutal-card bg-card">
                <CardContent className="p-6 space-y-4">
                  <div className="text-center">
                    <p className="text-sm font-bold text-foreground/60">vs Midjourney</p>
                    <p className="text-3xl md:text-4xl font-black text-foreground mt-2">Save 85%</p>
                    <p className="text-sm font-medium mt-2">They charge $10-60/mo</p>
                    <p className="text-lg font-black gradient-text mt-1">We start at $3.99/mo</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="brutal-card bg-card">
                <CardContent className="p-6 space-y-4">
                  <div className="text-center">
                    <p className="text-sm font-bold text-foreground/60">vs Runway</p>
                    <p className="text-3xl md:text-4xl font-black text-foreground mt-2">Save 75%</p>
                    <p className="text-sm font-medium mt-2">They charge $15-95/mo</p>
                    <p className="text-lg font-black gradient-text mt-1">We start at $3.99/mo</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="brutal-card bg-card">
                <CardContent className="p-6 space-y-4">
                  <div className="text-center">
                    <p className="text-sm font-bold text-foreground/60">vs Jasper.ai</p>
                    <p className="text-3xl md:text-4xl font-black text-primary mt-2">Save 90%</p>
                    <p className="text-sm font-medium mt-2">They charge $39-125/mo</p>
                    <p className="text-lg font-black gradient-text mt-1">We start at $3.99/mo</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="text-center mt-8">
              <p className="text-sm font-medium text-foreground/60 px-4">
                💰 From $0.00053 per token—highly competitive rates
              </p>
            </div>
          </div>
        </section>

        {/* Why Choose Section */}
        <section className="container mx-auto px-4 py-12 md:py-20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 md:mb-16">
              <h3 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 px-4">WHY ARTIFIO</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              <article className="text-center space-y-3 md:space-y-4">
                <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-neon-green border-3 md:border-4 border-black flex items-center justify-center mx-auto brutal-shadow">
                  <span className="text-3xl md:text-4xl" aria-hidden="true">💰</span>
                </div>
                <h4 className="text-2xl md:text-3xl font-black px-4">UNBEATABLE VALUE</h4>
                <p className="text-foreground/80 font-medium text-base md:text-lg px-4">
                  Starting at just $3.99/mo—less than a coffee. Get the same power as $50-100/mo tools for a fraction of the price
                </p>
              </article>

              <article className="text-center space-y-3 md:space-y-4">
                <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-neon-yellow border-3 md:border-4 border-black flex items-center justify-center mx-auto brutal-shadow">
                  <Zap className="h-8 w-8 md:h-10 md:w-10 text-black" aria-hidden="true" />
                </div>
                <h4 className="text-2xl md:text-3xl font-black px-4">INSTANT RESULTS</h4>
                <p className="text-foreground/80 font-medium text-base md:text-lg px-4">
                  No waiting, no rendering queues—your creations are ready in seconds
                </p>
              </article>
              
              <article className="text-center space-y-3 md:space-y-4">
                <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-neon-blue border-3 md:border-4 border-black flex items-center justify-center mx-auto brutal-shadow">
                  <Shield className="h-8 w-8 md:h-10 md:w-10 text-white" aria-hidden="true" />
                </div>
                <h4 className="text-2xl md:text-3xl font-black px-4">ENTERPRISE GRADE</h4>
                <p className="text-foreground/80 font-medium text-base md:text-lg px-4">
                  99.9% uptime with bank-level security and 24/7 support
                </p>
              </article>
              
              <article className="text-center space-y-3 md:space-y-4">
                <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-neon-pink border-3 md:border-4 border-black flex items-center justify-center mx-auto brutal-shadow">
                  <Sparkles className="h-8 w-8 md:h-10 md:w-10 text-white" aria-hidden="true" />
                </div>
                <h4 className="text-2xl md:text-3xl font-black px-4">NO EXPERIENCE NEEDED</h4>
                <p className="text-foreground/80 font-medium text-base md:text-lg px-4">
                  Just describe what you want—our AI handles all the technical details
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="container mx-auto px-4 py-12 md:py-20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 md:mb-12">
              <h3 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 px-4">CREATORS LOVE THE SAVINGS</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="brutal-card bg-neon-yellow/10">
                <CardContent className="p-6 space-y-4">
                  <p className="text-lg font-bold">"I cut my content costs by 90% switching to Artifio.ai"</p>
                  <p className="text-sm font-medium text-foreground/60">— Sarah M., Content Creator</p>
                </CardContent>
              </Card>
              
              <Card className="brutal-card bg-neon-blue/10">
                <CardContent className="p-6 space-y-4">
                  <p className="text-lg font-bold">"Same quality as premium tools, 1/10th the price"</p>
                  <p className="text-sm font-medium text-foreground/60">— Mike R., Marketing Agency</p>
                </CardContent>
              </Card>
              
              <Card className="brutal-card bg-neon-pink/10">
                <CardContent className="p-6 space-y-4">
                  <p className="text-lg font-bold">"Why pay $50/month when I get the same power for $7.99?"</p>
                  <p className="text-sm font-medium text-foreground/60">— Jessica L., Freelancer</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-12 md:py-20">
          <Card className="p-8 md:p-16 text-center max-w-5xl mx-auto bg-gradient-primary hover-lift">
            <div className="space-y-6 md:space-y-8">
              <h3 className="text-3xl sm:text-4xl md:text-5xl font-black text-white px-4">STOP OVERPAYING. START CREATING.</h3>
              <p className="text-lg md:text-2xl text-white/90 font-medium px-4">
                Join thousands who switched from overpriced AI tools to Artifio.ai and saved hundreds per year
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 px-4">
                <Button
                  variant="neon"
                  size="lg"
                  onClick={() => navigate("/auth")}
                  className="w-full sm:w-auto text-base md:text-xl px-8 md:px-16"
                >
                  GET 500 FREE TOKENS
                </Button>
              </div>
              <p className="text-white/80 font-medium text-sm md:text-base">
                No credit card required • No commitments • Start in 30 seconds
              </p>
            </div>
          </Card>
        </section>

        <Footer />
      </div>
    </div>
  );
};

export default Index;
