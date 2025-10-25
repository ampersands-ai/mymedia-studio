import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/Footer";
import { StatCounter } from "@/components/homepage/StatCounter";
import { ProblemCard } from "@/components/homepage/ProblemCard";
import { useTemplates } from "@/hooks/useTemplates";
import { lazy, Suspense, useState } from "react";
import { Check, Frown, Clock, HelpCircle, DollarSign, Palette, Edit, Download, Video, Image, Music, FileText } from "lucide-react";
import { MobileMenu } from "@/components/MobileMenu";
import { useUserTokens } from "@/hooks/useUserTokens";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { GallerySkeleton, PricingSkeleton } from "@/components/ui/skeletons";
import { usePrefetchOnHover } from "@/utils/routePreload";

// Lazy load heavy components
const FeatureShowcase = lazy(() => import("@/components/homepage/FeatureShowcase").then(m => ({ default: m.FeatureShowcase })));
const TestimonialCarousel = lazy(() => import("@/components/homepage/TestimonialCarousel").then(m => ({ default: m.TestimonialCarousel })));
const FAQAccordion = lazy(() => import("@/components/homepage/FAQAccordion").then(m => ({ default: m.FAQAccordion })));
const ComparisonTable = lazy(() => import("@/components/homepage/ComparisonTable").then(m => ({ default: m.ComparisonTable })));

// Import assets
import logoImage from "@/assets/logo.png";
import midjourney from "@/assets/partners/midjourney-alt.webp";
import openai from "@/assets/partners/openai.png";
import claude from "@/assets/partners/claude.svg";
import gemini from "@/assets/partners/gemini.png";
import runway from "@/assets/partners/runway.png";
import elevenlabs from "@/assets/partners/elevenlabs.png";
import suno from "@/assets/partners/suno.svg";
import pika from "@/assets/partners/hailuo.png";

const IndexV2 = () => {
  const { user } = useAuth();
  const { data: templates } = useTemplates();
  const { data: tokenData } = useUserTokens();
  const tokenBalance = tokenData?.tokens_remaining ?? undefined;
  const [templateFilter, setTemplateFilter] = useState("all");

  const filteredTemplates = templates?.filter((template) => {
    if (templateFilter === "all") return true;
    if (templateFilter === "video") return template.category === "video";
    if (templateFilter === "image") return template.category === "image";
    if (templateFilter === "audio") return template.category === "audio";
    return true;
  }).slice(0, 8);

  return (
    <div className="min-h-screen bg-background">
      {/* Header/Navigation */}
      <header className="sticky top-0 z-50 bg-background border-b-4 border-black">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between gap-4">
            {/* Logo - Left side */}
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <OptimizedImage 
                src={logoImage} 
                alt="artifio.ai logo" 
                className="h-6 md:h-8 object-contain" 
                width={32}
                height={32}
                priority
              />
              <span className="font-black text-xl md:text-2xl text-foreground">artifio.ai</span>
            </Link>

            {/* Desktop Navigation - Center/Right */}
            <div className="hidden md:flex items-center gap-6">
              <Link to="/features" className="font-bold text-neutral-700 hover:text-secondary-600 transition-colors">
                Features
              </Link>
              <Link to="/dashboard/templates" className="font-bold text-neutral-700 hover:text-secondary-600 transition-colors">
                Templates
              </Link>
              <Link to="/pricing" className="font-bold text-neutral-700 hover:text-secondary-600 transition-colors">
                Pricing
              </Link>
              <Link to="/community" className="font-bold text-neutral-700 hover:text-secondary-600 transition-colors">
                Community
              </Link>
            </div>

            {/* Auth Buttons - Right side */}
            <div className="flex items-center gap-3">
              {user ? (
                <Button asChild variant="default">
                  <Link to="/dashboard/custom-creation">Go to Dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="secondary" className="font-bold">
                    <Link to="/auth">Login</Link>
                  </Button>
                  <Button asChild variant="default" className="hidden sm:inline-flex">
                    <Link to="/auth">Sign Up</Link>
                  </Button>
                </>
              )}
              <MobileMenu tokenBalance={tokenBalance} />
            </div>
          </nav>
        </div>
      </header>

      {/* Section 1: Hero */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-6xl mx-auto text-center space-y-8">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black leading-tight text-neutral-900">
            Create Professional Videos, Images & Music
            <br />
            <span className="text-primary-600">In Minutes—Not Hours</span>
          </h1>
          <p className="text-xl md:text-2xl text-neutral-600 max-w-3xl mx-auto">
            One platform. 22+ AI models. 200+ ready-to-use templates.
            Everything creators need at 1/5th the cost.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button asChild variant="default" size="lg" className="text-lg" {...usePrefetchOnHover('create')}>
              <Link to="/auth">START CREATING FOR FREE</Link>
            </Button>
            <Button asChild variant="secondary" size="lg" className="text-lg" {...usePrefetchOnHover('pricing')}>
              <Link to="/pricing">SEE PRICING</Link>
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center text-sm text-neutral-500">
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-success" />
              500 Free Tokens • No Credit Card
            </span>
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-success" />
              10,000+ Creators Worldwide
            </span>
          </div>
        </div>
      </section>

      {/* Section 2: Social Proof Bar */}
      <section className="border-y-4 border-black bg-neutral-50 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatCounter end={10000} suffix="+" label="Creators" />
            <StatCounter end={500000} suffix="+" label="Generations" />
            <StatCounter end={120} suffix="+" label="Countries" />
            <StatCounter end={4.8} suffix="/5" label="Rating" />
          </div>
        </div>
      </section>

      {/* Section 3: Problem/Solution */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-6xl mx-auto space-y-12">
          <h2 className="text-3xl md:text-5xl font-black text-center">
            Sound Familiar?
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ProblemCard
              icon={<Frown className="w-16 h-16" />}
              text="I'm paying $100+/month across 5 different AI subscriptions"
            />
            <ProblemCard
              icon={<Clock className="w-16 h-16" />}
              text="I spend 2 hours switching between tools just to create one piece of content"
            />
            <ProblemCard
              icon={<HelpCircle className="w-16 h-16" />}
              text="I don't know which AI model to use for what—it's overwhelming"
            />
            <ProblemCard
              icon={<DollarSign className="w-16 h-16" />}
              text="Premium tools are too expensive for my creator budget"
            />
          </div>
          
          <div className="text-center space-y-8 pt-8">
            <h2 className="text-3xl md:text-5xl font-black">
              <span className="font-bold">artifio.ai</span> Solves This
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              One Platform. Every Tool. Affordable Pricing.
            </p>
            <p className="text-lg max-w-2xl mx-auto">
              <span className="font-bold">artifio.ai</span> brings all the AI models you need into one place,
              with templates that work and pricing that makes sense.
            </p>
            <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto text-left">
              <div className="flex items-start gap-3">
                <span className="text-primary font-black text-xl">→</span>
                <span>No more juggling subscriptions</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-primary font-black text-xl">→</span>
                <span>No more learning curves</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-primary font-black text-xl">→</span>
                <span>No more breaking the bank</span>
              </div>
            </div>
            <Button asChild variant="default" size="lg">
              <Link to="/auth">Start Creating Free</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Section 4: Template Gallery */}
      <section className="bg-neutral-50 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-3xl md:text-5xl font-black">
                200+ Templates Ready to Use
              </h2>
              <p className="text-xl text-muted-foreground">
                Pick one, add your prompt, create in seconds
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-3">
              {["all", "video", "image", "audio"].map((filter) => (
                <Button
                  key={filter}
                  variant={templateFilter === filter ? "default" : "outline"}
                  onClick={() => setTemplateFilter(filter)}
                  className="capitalize"
                >
                  {filter}
                </Button>
              ))}
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredTemplates?.map((template) => (
                <Link
                  key={template.id}
                  to={`/dashboard/custom-creation?template=${template.id}`}
                  className="group brutalist-card gpu-accelerated card overflow-hidden hover-lift"
                  {...usePrefetchOnHover('custom-creation')}
                >
                  <div className="aspect-video bg-muted relative overflow-hidden">
                    {template.thumbnail_url && (
                      <OptimizedImage
                        src={template.thumbnail_url}
                        alt={template.name}
                        className="w-full h-full object-cover"
                        width={600}
                        height={338}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      />
                    )}
                  </div>
                  <div className="p-4 space-y-2">
                    <h3 className="font-bold text-lg line-clamp-2">{template.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {template.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>

            <div className="text-center">
              <Button asChild variant="outline" size="lg" {...usePrefetchOnHover('custom-creation')}>
                <Link to="/dashboard/custom-creation">Browse All Templates →</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: How It Works */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-5xl font-black">How It Works</h2>
            <p className="text-xl text-muted-foreground">
              Create professional content in 3 steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                icon: <Palette className="w-16 h-16" />,
                title: "Pick a Template",
                desc: "Browse 200+ templates for every platform (Or start from scratch in Custom Mode)",
              },
              {
                step: "2",
                icon: <Edit className="w-16 h-16" />,
                title: "Describe What You Want",
                desc: "Enter your prompt or upload an image. Our AI does the rest",
              },
              {
                step: "3",
                icon: <Download className="w-16 h-16" />,
                title: "Download & Share",
                desc: "Get your creation in seconds. Use it anywhere you want",
              },
            ].map((item) => (
              <div key={item.step} className="text-center space-y-4">
                <div className="flex justify-center text-secondary-600">{item.icon}</div>
                <div className="text-5xl font-black text-primary">{item.step}</div>
                <h3 className="text-2xl font-black">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 6: Feature Showcase */}
      <section className="bg-neutral-50 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto space-y-24">
            <Suspense fallback={<GallerySkeleton />}>
              <FeatureShowcase
                title="200+ Ready-to-Use Templates"
                description="No prompt engineering. No guesswork. Just pick a template and start creating."
                benefits={[
                  "YouTube thumbnails, TikTok videos, Instagram posts",
                  "Updated weekly with new templates",
                  "Community-created templates (coming soon)",
                ]}
                ctaText="Browse Templates →"
                ctaLink="/dashboard/custom-creation"
                visual={
                  <div className="text-center text-muted-foreground">
                    Template library interface preview
                  </div>
                }
              />

              <FeatureShowcase
                title="22+ AI Models in One Place"
                description="Not happy with the result? Switch models instantly. Access Midjourney, Runway, DALL-E, and more."
                benefits={[
                  "Compare outputs side-by-side",
                  "No need for 22 separate subscriptions",
                  "Always get the best tool for the job",
                ]}
                ctaText="See All Models →"
                ctaLink="/pricing"
                visual={
                  <div className="space-y-2">
                    <div className="text-sm font-bold text-muted-foreground mb-4">
                      Select AI Model:
                    </div>
                    {["Midjourney", "DALL-E 3", "Runway", "Flux"].map((model) => (
                      <div key={model} className="p-3 bg-background border-2 border-black">
                        {model}
                      </div>
                    ))}
                  </div>
                }
                reversed
              />

              <FeatureShowcase
                title="Simple, Predictable Pricing"
                description="No per-minute charges. No surprise bills. Just tokens you can use anytime."
                benefits={[
                  "Know exactly what you're spending",
                  "Unused tokens roll over",
                  "Top up anytime you need",
                ]}
                ctaText="See Pricing →"
                ctaLink="/pricing"
                visual={
                  <div className="text-center space-y-4">
                    <div className="text-5xl font-black text-primary">10,000</div>
                    <div className="text-muted-foreground">Tokens Remaining</div>
                  </div>
                }
              />

              <FeatureShowcase
                title="Advanced Mode for Power Users"
                description="Start from scratch when templates aren't enough. Full control over every parameter."
                benefits={[
                  "Choose any AI model",
                  "Adjust all settings",
                  "Perfect for experimentation",
                ]}
                ctaText="Try Custom Mode →"
                ctaLink="/dashboard/custom-creation"
                visual={
                  <div className="text-center text-muted-foreground">
                    Custom creation interface preview
                  </div>
                }
                reversed
              />
            </Suspense>
          </div>
        </div>
      </section>

      {/* Section 7: Pricing Comparison */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-6xl mx-auto space-y-12">
          <h2 className="text-3xl md:text-5xl font-black text-center">
            Stop Overpaying for AI Tools
          </h2>
          <Suspense fallback={<PricingSkeleton />}>
            <ComparisonTable />
          </Suspense>
          <div className="text-center">
            <Button asChild variant="default" size="lg" {...usePrefetchOnHover('pricing')}>
              <Link to="/pricing">Start Saving Now →</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Section 8: Testimonials */}
      <section className="bg-neutral-50 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto space-y-12">
            <h2 className="text-3xl md:text-5xl font-black text-center">
              Loved by 10,000+ Creators
            </h2>
            <Suspense fallback={<div className="h-64 skeleton rounded-xl" />}>
              <TestimonialCarousel />
            </Suspense>
          </div>
        </div>
      </section>

      {/* Section 9: Community Showcase */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-5xl font-black">
              Made by Creators Like You
            </h2>
            <p className="text-xl text-muted-foreground">
              Join the community and share your creations
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="aspect-square brutalist-card bg-muted hover-lift cursor-pointer"
              />
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild variant="outline" size="lg">
              <Link to="/community">Browse Gallery →</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Section 10: Model Marketplace */}
      <section className="bg-neutral-50 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-3xl md:text-5xl font-black">
                Access 22+ AI Models
              </h2>
              <p className="text-xl text-muted-foreground">
                All the best AI tools, one subscription
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-2xl font-black flex items-center gap-2">
                  <Video className="w-6 h-6 text-secondary-600" />
                  VIDEO GENERATION
                </h3>
                <div className="flex flex-wrap gap-4">
                  {[runway, pika].map((logo, i) => (
                    <img
                      key={i}
                      src={logo}
                      alt="AI Model"
                      className="h-12 object-contain"
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-2xl font-black flex items-center gap-2">
                  <Image className="w-6 h-6 text-secondary-600" />
                  IMAGE GENERATION
                </h3>
                <div className="flex flex-wrap gap-4">
                  {[midjourney, openai].map((logo, i) => (
                    <img
                      key={i}
                      src={logo}
                      alt="AI Model"
                      className="h-12 object-contain"
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-2xl font-black flex items-center gap-2">
                  <Music className="w-6 h-6 text-secondary-600" />
                  AUDIO GENERATION
                </h3>
                <div className="flex flex-wrap gap-4">
                  {[elevenlabs, suno].map((logo, i) => (
                    <img
                      key={i}
                      src={logo}
                      alt="AI Model"
                      className="h-12 object-contain"
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-2xl font-black flex items-center gap-2">
                  <FileText className="w-6 h-6 text-secondary-600" />
                  TEXT GENERATION
                </h3>
                <div className="flex flex-wrap gap-4">
                  {[openai, claude, gemini].map((logo, i) => (
                    <img
                      key={i}
                      src={logo}
                      alt="AI Model"
                      className="h-12 object-contain"
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="text-center">
              <p className="text-lg font-bold text-muted-foreground">
                + 12 more models
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 11: FAQ */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto space-y-12">
          <h2 className="text-3xl md:text-5xl font-black text-center">
            Frequently Asked Questions
          </h2>
          <Suspense fallback={<div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 skeleton rounded-lg" />)}
          </div>}>
            <FAQAccordion />
          </Suspense>
        </div>
      </section>

      {/* Section 12: Final CTA */}
      <section className="bg-primary-500 py-12 md:py-16 lg:py-24 border-y-4 border-black">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center space-y-6 md:space-y-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-neutral-900 px-2">
              Ready to Start Creating?
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-neutral-900/90 max-w-2xl mx-auto px-2">
              Join 10,000+ creators making professional content with AI—no expensive
              subscriptions, no technical skills required.
            </p>
            <div className="px-2">
              <Button asChild size="lg" className="text-sm sm:text-base md:text-lg lg:text-xl px-6 sm:px-8 md:px-12 py-4 sm:py-6 bg-white hover:bg-neutral-50 text-neutral-900 border-2 border-neutral-900 shadow-xl w-full sm:w-auto" {...usePrefetchOnHover('create')}>
                <Link to="/auth">START FREE - GET 500 TOKENS</Link>
              </Button>
            </div>
            <div className="flex flex-col gap-2 sm:gap-3 text-neutral-900/90 text-sm sm:text-base px-2">
              <span className="flex items-center justify-center gap-2">
                <Check className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                No credit card required
              </span>
              <span className="flex items-center justify-center gap-2">
                <Check className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                Access all templates
              </span>
              <span className="flex items-center justify-center gap-2">
                <Check className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                Try all 22 AI models
              </span>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default IndexV2;
