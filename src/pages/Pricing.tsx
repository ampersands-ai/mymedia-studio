import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { trackEvent } from "@/lib/posthog";
import { logger } from "@/lib/logger";

const plans = [
  {
    name: "Veo Connoisseur",
    monthlyPrice: "$94.99",
    annualPrice: "$74.99",
    period: "/mo",
    credits: "5000",
    monthlyPerCredit: "$0.019",
    annualPerCredit: "$0.015",
    features: [
      "No watermark",
      "Commercial license",
      "24/7 premium support",
      "Early access to new features",
    ],
    popular: false,
    badge: "BEST VALUE",
    color: "bg-accent",
    description: "Ultimate power for professionals and agencies. 5000 credits at the best rate—unmatched value for serious creators.",
    savings: "Best per-credit pricing available",
    concurrentGenerations: 7,
  },
  {
    name: "Ultimate",
    monthlyPrice: "$49.99",
    annualPrice: "$39.99",
    period: "/mo",
    credits: "2500",
    monthlyPerCredit: "$0.020",
    annualPerCredit: "$0.016",
    features: [
      "No watermark",
      "Commercial license",
      "24/7 premium support",
    ],
    popular: false,
    badge: "MOST POPULAR",
    color: "bg-neon-red",
    description: "Enterprise power at freelancer prices. 2500 credits for just $39.99/mo—competitors charge $99+ for less.",
    savings: "Save $60-85/mo vs competitors",
    concurrentGenerations: 5,
  },
  {
    name: "Professional",
    monthlyPrice: "$24.99",
    annualPrice: "$19.99",
    period: "/mo",
    credits: "1000",
    monthlyPerCredit: "$0.025",
    annualPerCredit: "$0.020",
    features: [
      "No watermark",
      "Unlimited image & text gens",
      "Dedicated support",
    ],
    popular: true,
    color: "bg-primary",
    badge: undefined,
    description: "All the tools you need for less than $20/mo. 1000 credits + unlimited image & text. Save $100s every year.",
    savings: "Save $80-105/mo vs competitors",
    concurrentGenerations: 3,
  },
  {
    name: "Explorer",
    monthlyPrice: "$9.99",
    annualPrice: "$7.99",
    period: "/mo",
    credits: "375",
    monthlyPerCredit: "$0.027",
    annualPerCredit: "$0.021",
    features: [
      "No watermark",
      "Global availability",
      "Advanced features",
    ],
    popular: false,
    color: "bg-neon-pink",
    badge: undefined,
    description: "The indie creator's choice. 375 credits for just $7.99/mo—competitors charge $30-50 for similar plans.",
    savings: "Save $22-42/mo vs competitors",
    concurrentGenerations: 1,
  },
  {
    name: "Freemium",
    price: "FREE",
    monthlyPrice: "FREE",
    annualPrice: "FREE",
    credits: "5",
    monthlyPerCredit: "Free",
    annualPerCredit: "Free",
    features: [
      "Watermark on videos",
      "Limited access",
      "Basic support",
    ],
    popular: false,
    color: "bg-muted",
    description: "Always free. Always accessible. Try before you buy—no commitment required.",
  },
];

const Pricing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAnnual, setIsAnnual] = useState(true);
  const [isCreatingPayment, setIsCreatingPayment] = useState<string | null>(null);

  const handleSubscribe = async (planName: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (planName === "Freemium") {
      navigate("/dashboard/custom-creation");
      return;
    }

    // Track upgrade click
    trackEvent('upgrade_clicked', {
      plan_name: planName,
      billing_period: isAnnual ? 'annual' : 'monthly',
    });

    setIsCreatingPayment(planName);

    try {
      // Use unified payment function with automatic Dodo/Stripe failover
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          plan: planName,
          isAnnual,
          appOrigin: window.location.origin,
        },
      });

      if (error) {
        logger.error('Payment creation error', error instanceof Error ? error : new Error(String(error)), {
          component: 'Pricing',
          operation: 'handlePayment',
          planName,
          isAnnual
        });
        
        // Check if it's a 503 service unavailable error
        if (error.message?.includes('SERVICE_UNAVAILABLE') || 
            error.message?.includes('temporarily unavailable')) {
          toast.error('Payment service is temporarily unavailable. Please try again in a few seconds.');
        } else {
          toast.error(`Failed to create payment session: ${error.message || 'Please try again'}`);
        }
        
        setIsCreatingPayment(null);
        return;
      }

      if (data.checkout_url) {
        // Show info toast if using backup provider
        if (data.provider === 'stripe') {
          toast.info('Processing with backup payment provider');
        }
        
        // Track payment initiation
        trackEvent('payment_initiated', {
          plan_name: planName,
          billing_period: isAnnual ? 'annual' : 'monthly',
          provider: data.provider || 'dodo',
        });
        window.location.href = data.checkout_url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      logger.error('Error creating payment', error instanceof Error ? error : new Error(String(error)), {
        component: 'Pricing',
        operation: 'handlePayment',
        planName,
        isAnnual
      });
      toast.error(`Failed to create payment session: ${error instanceof Error ? error.message : 'Please try again'}`);
      setIsCreatingPayment(null);
    }
  };

  // Add structured data for SEO
  useEffect(() => {
    // Product/Service offers schema
    const offersSchema = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": "Artifio.ai AI Content Creation Platform",
      "description": "Affordable AI-powered content creation with plans from $7.99/mo. Create videos, images, music, and text.",
      "brand": {
        "@type": "Brand",
        "name": "Artifio.ai"
      },
      "offers": plans.map(plan => ({
        "@type": "Offer",
        "name": plan.name,
        "price": plan.annualPrice === "FREE" ? "0" : plan.annualPrice.replace('$', ''),
        "priceCurrency": "USD",
        "description": plan.description,
        "priceValidUntil": "2025-12-31",
        "availability": "https://schema.org/InStock",
        "url": "https://artifio.ai/pricing"
      })),
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.8",
        "ratingCount": "1250"
      }
    };

    // Comparison table schema
    const comparisonSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How much cheaper is Artifio.ai compared to Midjourney?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Artifio.ai is 85% cheaper than Midjourney. While Midjourney charges $10-60/mo, Artifio.ai starts at just $7.99/mo with similar features."
          }
        },
        {
          "@type": "Question",
          "name": "What is the cheapest AI video creation plan?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Artifio.ai Explorer plan is the cheapest at $7.99/mo (annual billing) with 375 credits, perfect for APAC and LATAM creators."
          }
        },
        {
          "@type": "Question",
          "name": "Does Artifio.ai offer a free plan?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, Artifio.ai offers a Freemium plan with 5 free credits. No credit card required. Perfect for testing the platform before upgrading."
          }
        }
      ]
    };

    // BreadcrumbList
    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://artifio.ai/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Pricing",
          "item": "https://artifio.ai/pricing"
        }
      ]
    };

    const schemas = [offersSchema, comparisonSchema, breadcrumbSchema];
    const scriptElements: HTMLScriptElement[] = [];

    schemas.forEach(schema => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.text = JSON.stringify(schema);
      document.head.appendChild(script);
      scriptElements.push(script);
    });

    // Update meta tags
    document.title = "Pricing - Artifio.ai | AI Content Creation from $7.99/mo";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Affordable AI content creation plans starting at $7.99/mo. 50-80% cheaper than Midjourney, Runway & Jasper. Free plan available with 5 credits. Compare and save today.');
    }

    return () => {
      scriptElements.forEach(script => {
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      });
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b-4 border-black bg-card">
          <nav className="container mx-auto px-4 py-3 md:py-4" aria-label="Main navigation">
            <div className="flex items-center justify-between">
              <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <img 
                  src={logo} 
                  alt="artifio.ai logo" 
                  className="h-6 md:h-8 object-contain"
                />
                <span className="font-black text-xl md:text-2xl text-foreground">artifio.ai</span>
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

        <main className="container mx-auto px-4 py-16">
          <div className="text-center space-y-6 mb-12">
            <h2 className="text-5xl md:text-6xl font-black">Simple, Transparent Pricing</h2>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
              One of the best in the market in Pricing, Consistency and Features.
            </p>
            <p className="text-2xl md:text-3xl font-bold text-primary">
              Throwaway prices. Premium Experience.
            </p>
          </div>

          {/* Billing Toggle */}
          <div className="flex justify-center mb-12">
            <div className="inline-flex items-center gap-4 px-6 py-3 rounded-full bg-card border-3 border-black brutal-shadow">
              <button
                onClick={() => setIsAnnual(false)}
                className={`inline-flex items-center px-4 py-2 rounded-full font-black transition-all ${
                  !isAnnual
                    ? "bg-primary text-black"
                    : "text-foreground/60 hover:text-foreground"
                }`}
              >
                MONTHLY
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                className={`inline-flex items-center px-4 py-2 rounded-full font-black transition-all ${
                  isAnnual
                    ? "bg-primary text-black"
                    : "text-foreground/60 hover:text-foreground"
                }`}
              >
                ANNUAL
                <span className="ml-2 inline-flex items-center leading-none h-6 text-xs px-2 py-0.5 bg-secondary text-white rounded-full">
                  SAVE 20%
                </span>
              </button>
            </div>
          </div>

          {/* All Plans Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto pt-12 mb-16">
          {plans.map((plan) => (
            <div key={plan.name} className="relative">
                {plan.badge && (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-50 bg-primary px-4 py-1.5 rounded-full text-sm font-black text-black shadow-lg border-2 border-black whitespace-nowrap">
                    {plan.badge}
                  </div>
                )}
            <Card
              className={`hover-lift ${plan.popular ? "ring-4 ring-primary" : ""}`}
            >
              <CardHeader>
                <CardTitle className="text-2xl font-black">{plan.name}</CardTitle>
                  <div className="pt-3">
                    {isAnnual && plan.monthlyPrice !== "FREE" ? (
                      <div className="space-y-1">
                        <div className="text-xl font-bold line-through text-muted-foreground">
                          {plan.monthlyPrice}
                        </div>
                        <div>
                          <span className="text-4xl font-black">{plan.annualPrice}</span>
                          <span className="text-muted-foreground font-bold">/mo</span>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <span className="text-4xl font-black">
                          {plan.monthlyPrice === "FREE" ? "FREE" : isAnnual ? plan.annualPrice : plan.monthlyPrice}
                        </span>
                        {plan.monthlyPrice !== "FREE" && (
                          <span className="text-muted-foreground font-bold">/mo</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 pt-2">
                    <div className="text-xs text-muted-foreground">
                      {plan.credits} credits
                    </div>
                    <div className="text-sm font-bold text-primary">
                      {isAnnual ? plan.annualPerCredit : plan.monthlyPerCredit} per credit
                    </div>
                    {plan.concurrentGenerations && (
                      <div className="text-xs text-muted-foreground">
                        {plan.concurrentGenerations} concurrent generation{plan.concurrentGenerations > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full font-bold"
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => handleSubscribe(plan.name)}
                    disabled={isCreatingPayment === plan.name}
                  >
                    {isCreatingPayment === plan.name
                      ? "Loading..."
                      : plan.monthlyPrice === "FREE"
                      ? "START FREE"
                      : "GET STARTED"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          ))}
          </div>

          {/* Feature Comparison Chart */}
          <div className="max-w-7xl mx-auto mb-16">
            <h3 className="text-3xl md:text-4xl font-black text-center mb-12">Compare Plans</h3>
            <Card className="brutal-card overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px]">
                    <thead>
                      <tr className="border-b-3 border-black bg-muted/30">
                        <th className="py-6 px-6 text-left font-black text-lg w-1/4">Features</th>
                        {plans.filter(p => p.name !== "Freemium").map((plan) => (
                          <th key={plan.name} className="py-6 px-4 text-center w-[18.75%]">
                            <div className="space-y-2">
                              {plan.badge && (
                                <div className="inline-block bg-primary px-3 py-1 rounded-full text-xs font-black text-black mb-2">
                                  {plan.badge}
                                </div>
                              )}
                              <div className="font-black text-lg">{plan.name}</div>
                              <div className="text-2xl font-black text-primary">
                                {isAnnual ? plan.annualPrice : plan.monthlyPrice}
                                <span className="text-sm text-muted-foreground font-normal">/mo</span>
                              </div>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Credits */}
                      <tr className="border-b border-border hover:bg-muted/20 transition-colors">
                        <td className="py-4 px-6 font-semibold">Credits per month</td>
                        {plans.filter(p => p.name !== "Freemium").map((plan) => (
                          <td key={plan.name} className="py-4 px-4 text-center font-bold text-primary">
                            {plan.credits}
                          </td>
                        ))}
                      </tr>
                      
                      {/* Price per credit */}
                      <tr className="border-b border-border hover:bg-muted/20 transition-colors">
                        <td className="py-4 px-6 font-semibold">Price per credit</td>
                        {plans.filter(p => p.name !== "Freemium").map((plan) => (
                          <td key={plan.name} className="py-4 px-4 text-center text-sm text-muted-foreground">
                            {isAnnual ? plan.annualPerCredit : plan.monthlyPerCredit}
                          </td>
                        ))}
                      </tr>
                      
                      {/* Concurrent Generations */}
                      <tr className="border-b border-border hover:bg-muted/20 transition-colors">
                        <td className="py-4 px-6 font-semibold">Concurrent generations</td>
                        {plans.filter(p => p.name !== "Freemium").map((plan) => (
                          <td key={plan.name} className="py-4 px-4 text-center font-bold">
                            {plan.concurrentGenerations || 1}
                          </td>
                        ))}
                      </tr>
                      
                      {/* Watermark */}
                      <tr className="border-b border-border hover:bg-muted/20 transition-colors">
                        <td className="py-4 px-6 font-semibold">No watermark</td>
                        {plans.filter(p => p.name !== "Freemium").map((plan) => (
                          <td key={plan.name} className="py-4 px-4 text-center">
                            <Check className="h-5 w-5 text-primary mx-auto" />
                          </td>
                        ))}
                      </tr>
                      
                      {/* Commercial License */}
                      <tr className="border-b border-border hover:bg-muted/20 transition-colors">
                        <td className="py-4 px-6 font-semibold">Commercial license</td>
                        {plans.filter(p => p.name !== "Freemium").map((plan) => (
                          <td key={plan.name} className="py-4 px-4 text-center">
                            {plan.name === "Veo Connoisseur" || plan.name === "Ultimate" ? (
                              <Check className="h-5 w-5 text-primary mx-auto" />
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        ))}
                      </tr>
                      
                      {/* Support */}
                      <tr className="border-b border-border hover:bg-muted/20 transition-colors">
                        <td className="py-4 px-6 font-semibold">Support level</td>
                        {plans.filter(p => p.name !== "Freemium").map((plan) => (
                          <td key={plan.name} className="py-4 px-4 text-center text-sm">
                            {plan.name === "Veo Connoisseur" || plan.name === "Ultimate" ? (
                              <span className="font-bold text-primary">24/7 Premium</span>
                            ) : plan.name === "Professional" ? (
                              <span>Dedicated</span>
                            ) : (
                              <span>Standard</span>
                            )}
                          </td>
                        ))}
                      </tr>
                      
                      {/* Early Access */}
                      <tr className="border-b border-border hover:bg-muted/20 transition-colors">
                        <td className="py-4 px-6 font-semibold">Early access to features</td>
                        {plans.filter(p => p.name !== "Freemium").map((plan) => (
                          <td key={plan.name} className="py-4 px-4 text-center">
                            {plan.name === "Veo Connoisseur" ? (
                              <Check className="h-5 w-5 text-primary mx-auto" />
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        ))}
                      </tr>
                      
                      {/* CTA Row */}
                      <tr className="bg-muted/10">
                        <td className="py-6 px-6"></td>
                        {plans.filter(p => p.name !== "Freemium").map((plan) => (
                          <td key={plan.name} className="py-6 px-4 text-center">
                            <Button
                              className="w-full font-bold"
                              variant="default"
                              onClick={() => handleSubscribe(plan.name)}
                              disabled={isCreatingPayment === plan.name}
                            >
                              {isCreatingPayment === plan.name ? "Loading..." : "Get Started"}
                            </Button>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Final CTA Section */}
          <div className="max-w-3xl mx-auto text-center space-y-6 py-16">
            <h3 className="text-4xl md:text-5xl font-black">Ready to Start Creating?</h3>
            <p className="text-xl text-muted-foreground">
              Join thousands of creators making stunning AI content.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate("/auth")} className="font-bold text-lg">
                START FREE
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/")} className="font-bold text-lg">
                LEARN MORE
              </Button>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
};

export default Pricing;
