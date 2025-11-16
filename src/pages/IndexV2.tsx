import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/Footer";
import { StatCounter } from "@/components/homepage/StatCounter";
import { ProblemCard } from "@/components/homepage/ProblemCard";
import { useTemplates } from "@/hooks/useTemplates";
import { lazy, Suspense, useState } from "react";
import { Check, Frown, Clock, HelpCircle, DollarSign } from "lucide-react";
import { GallerySkeleton, PricingSkeleton } from "@/components/ui/skeletons";
import { usePrefetchOnHover } from "@/hooks/useRoutePreload";
import { HeroSection } from "@/components/homepage/HeroSection";
import { TemplateCarousel } from "@/components/homepage/TemplateCarousel";
import { WorkflowSteps } from "@/components/homepage/WorkflowSteps";
import { GlobalHeader } from "@/components/GlobalHeader";

// Lazy load heavy components
const FeatureShowcase = lazy(() => import("@/components/homepage/FeatureShowcase").then(m => ({ default: m.FeatureShowcase })));
const TestimonialCarousel = lazy(() => import("@/components/homepage/TestimonialCarousel").then(m => ({ default: m.TestimonialCarousel })));
const FAQAccordion = lazy(() => import("@/components/homepage/FAQAccordion").then(m => ({ default: m.FAQAccordion })));
const ComparisonTable = lazy(() => import("@/components/homepage/ComparisonTable").then(m => ({ default: m.ComparisonTable })));

// Import assets
// Partner logos removed - ready to add new ones

const IndexV2 = () => {
  const { data: templates } = useTemplates();
  const [templateFilter] = useState("all");

  const filteredTemplates = templates?.filter((template) => {
    if (templateFilter === "all") return true;
    if (templateFilter === "video") return template.category === "video";
    if (templateFilter === "image") return template.category === "image";
    if (templateFilter === "audio") return template.category === "audio";
    return true;
  }).slice(0, 8);

  return (
    <div className="min-h-screen bg-background">
      <GlobalHeader />

      {/* Hero Section - New Design */}
      <HeroSection />

      {/* Section 2: Social Proof Bar */}
      <section className="border-y-4 border-black bg-neutral-50 dark:bg-neutral-900 py-12">
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
      <section className="container mx-auto px-4 spacing-section">
        <div className="max-w-6xl mx-auto space-y-12">
          <h2 className="text-heading-lg text-center">
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
            <h2 className="text-heading-lg">
              <span className="font-bold">artifio.ai</span> Solves This
            </h2>
            <p className="text-body-lg text-foreground max-w-3xl mx-auto">
              One Platform. Every Tool. Affordable Pricing.
            </p>
            <p className="text-body max-w-2xl mx-auto">
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

      {/* Template Carousel - New Design */}
      <TemplateCarousel templates={filteredTemplates || []} />

      {/* Workflow Steps - New Design */}
      <WorkflowSteps />

      {/* Section 6: Feature Showcase */}
      <section className="bg-neutral-50 dark:bg-neutral-900 spacing-section">
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
                  <div className="text-center text-foreground">
                    Template library interface preview
                  </div>
                }
              />

              <FeatureShowcase
                title="30+ AI Models in One Place"
                description="Not happy with the result? Switch models instantly. Access Midjourney, Runway, DALL-E, and more."
                benefits={[
                  "Compare outputs side-by-side",
                  "No need for 30 separate subscriptions",
                  "Always get the best tool for the job",
                ]}
                ctaText="See All Models →"
                ctaLink="/pricing"
                visual={
                  <div className="space-y-2">
                    <div className="text-sm font-bold text-foreground mb-4">
                      Select AI Model:
                    </div>
                    {["Midjourney", "DALL-E 3", "Runway", "Flux"].map((model) => (
                      <div key={model} className="p-3 bg-background border-2 border-neutral-300 dark:border-white hover:border-primary-orange dark:hover:border-primary-orange transition-colors cursor-pointer">
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
                    <div className="text-foreground">Credits Remaining</div>
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
                  <div className="text-center text-foreground">
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
      <section className="bg-neutral-50 dark:bg-neutral-900 spacing-section">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto space-y-12">
            <h2 className="text-heading-lg text-center">
              Loved by 10,000+ Creators
            </h2>
            <Suspense fallback={<div className="h-64 skeleton rounded-xl" />}>
              <TestimonialCarousel />
            </Suspense>
          </div>
        </div>
      </section>

      {/* Section 9: Community Showcase */}
      <section className="container mx-auto px-4 spacing-section">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-heading-lg">
              Made by Creators Like You
            </h2>
            <p className="text-body-lg text-foreground">
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

      {/* Section 11: FAQ */}
      <section className="container mx-auto px-4 spacing-section">
        <div className="max-w-4xl mx-auto space-y-12">
          <h2 className="text-heading-lg text-center">
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
      <section className="bg-primary-500 py-12 md:py-16 lg:py-24 border-y-4 border-black text-neutral-900">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center space-y-6 md:space-y-8">
            <h2 className="text-heading-lg !text-neutral-900 dark:!text-neutral-900 px-2">
              Ready to Start Creating?
            </h2>
            <p className="text-body text-neutral-900/90 max-w-2xl mx-auto px-2">
              Join 10,000+ creators making professional content with AI—no expensive
              subscriptions, no technical skills required.
            </p>
            <div className="px-2">
              <Button asChild size="lg" className="text-sm sm:text-base md:text-lg lg:text-xl px-6 sm:px-8 md:px-12 py-4 sm:py-6 bg-white hover:bg-neutral-50 dark:bg-card dark:hover:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border-2 border-neutral-900 dark:border-neutral-100 shadow-xl w-full sm:w-auto" {...usePrefetchOnHover('create')}>
                <Link to="/auth">START FREE - GET 5 CREDITS</Link>
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
                Try all 30 AI models
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
