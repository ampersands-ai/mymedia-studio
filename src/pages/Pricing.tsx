import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Sparkles } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";

const plans = [
  {
    name: "Freemium",
    price: "FREE",
    monthlyPrice: "FREE",
    annualPrice: "FREE",
    tokens: "500",
    perToken: "Always Free",
    features: [
      "500 tokens included",
      "Watermark on videos",
      "Limited access",
      "Basic support",
    ],
    popular: false,
    color: "bg-muted",
    description: "Always free. Always accessible. Try before you buy—no credit card, no commitments.",
  },
  {
    name: "Explorer",
    monthlyPrice: "$4.99",
    annualPrice: "$3.99",
    period: "/mo",
    tokens: "4,000",
    perToken: "$0.001 per token",
    features: [
      "4,000 tokens",
      "No watermark",
      "Regional access (APAC/LATAM)",
      "Priority support",
    ],
    popular: false,
    regions: "APAC/LATAM only",
    color: "bg-neon-blue",
    badge: "CHEAPEST ENTRY",
    description: "Affordable entry for APAC & LATAM creators. Less than a coffee per month—4,000 tokens to get started.",
    savings: "Perfect for getting started affordably",
  },
  {
    name: "Creators",
    monthlyPrice: "$9.99",
    annualPrice: "$7.99",
    period: "/mo",
    tokens: "10,000",
    perToken: "$0.0008 per token",
    features: [
      "10,000 tokens",
      "No watermark",
      "Global availability",
      "Priority rendering",
      "Advanced features",
    ],
    popular: true,
    color: "bg-neon-pink",
    badge: "FOR CREATORS",
    description: "The indie creator's choice. 10,000 tokens for just $7.99/mo—competitors charge $30-50 for similar plans.",
    savings: "Save $22-42/mo vs competitors",
  },
  {
    name: "Professional",
    monthlyPrice: "$24.99",
    annualPrice: "$19.99",
    period: "/mo",
    tokens: "32,500",
    perToken: "$0.0006 per token",
    features: [
      "32,500 tokens",
      "No watermark",
      "Unlimited image & text gens",
      "Priority rendering",
      "API access",
      "Dedicated support",
    ],
    popular: false,
    color: "bg-primary",
    badge: "FOR CREATORS",
    description: "All the tools you need for less than $20/mo. 32,500 tokens + unlimited image & text. Save $100s every year.",
    savings: "Save $80-105/mo vs competitors",
  },
  {
    name: "Ultimate",
    monthlyPrice: "$49.99",
    annualPrice: "$39.99",
    period: "/mo",
    tokens: "75,000",
    perToken: "$0.00053 per token",
    features: [
      "75,000 tokens",
      "No watermark",
      "Commercial license",
      "Fastest rendering priority",
      "API access",
      "White-label options",
      "24/7 premium support",
    ],
    popular: false,
    badge: "BEST VALUE",
    color: "bg-neon-red",
    description: "Enterprise power at freelancer prices. 75,000 tokens for just $39.99/mo—competitors charge $99+ for less.",
    savings: "Save $60-85/mo vs competitors",
  },
  {
    name: "Veo Connoisseur",
    monthlyPrice: "$119.99",
    annualPrice: "$89.99",
    period: "/mo",
    tokens: "200,000",
    perToken: "$0.00045 per token",
    features: [
      "200,000 tokens",
      "No watermark",
      "Commercial license",
      "Fastest rendering priority",
      "API access",
      "White-label options",
      "24/7 premium support",
      "Early access to new features",
    ],
    popular: false,
    badge: "PREMIUM",
    color: "bg-accent",
    description: "Ultimate power for professionals and agencies. 200,000 tokens at the best rate—unmatched value for serious creators.",
    savings: "Best per-token pricing available",
  },
];

const Pricing = () => {
  const navigate = useNavigate();
  const [isAnnual, setIsAnnual] = useState(true);

  // Add structured data for SEO
  useEffect(() => {
    // Product/Service offers schema
    const offersSchema = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": "Artifio.ai AI Content Creation Platform",
      "description": "Affordable AI-powered content creation with plans from $3.99/mo. Create videos, images, music, and text.",
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
            "text": "Artifio.ai is 85% cheaper than Midjourney. While Midjourney charges $10-60/mo, Artifio.ai starts at just $3.99/mo with similar features."
          }
        },
        {
          "@type": "Question",
          "name": "What is the cheapest AI video creation plan?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Artifio.ai Explorer plan is the cheapest at $3.99/mo (annual billing) with 4,000 tokens, perfect for APAC and LATAM creators."
          }
        },
        {
          "@type": "Question",
          "name": "Does Artifio.ai offer a free plan?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, Artifio.ai offers a Freemium plan with 500 free tokens. No credit card required. Perfect for testing the platform before upgrading."
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
    document.title = "Pricing - Artifio.ai | AI Content Creation from $3.99/mo";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Affordable AI content creation plans starting at $3.99/mo. 50-80% cheaper than Midjourney, Runway & Jasper. Free plan available with 500 tokens. Compare and save today.');
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
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-col items-center justify-center gap-4">
              <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="h-10 w-10 rounded-xl bg-gradient-primary border-3 border-black brutal-shadow flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-3xl font-black gradient-text">ARTIFIO.AI</h1>
              </Link>
              <Button variant="outline" onClick={() => navigate("/")}>
                BACK TO HOME
              </Button>
            </div>
          </div>
        </header>

        {/* Pricing Content */}
        <main className="container mx-auto px-4 py-16">
          <div className="text-center space-y-6 mb-12">
            <h2 className="text-5xl md:text-6xl font-black">Simple, Transparent Pricing</h2>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that fits your needs. All plans include no watermark on exports.
            </p>
          </div>

          {/* Billing Toggle */}
          <div className="flex justify-center mb-12">
            <div className="inline-flex items-center gap-4 px-6 py-3 rounded-full bg-card border-3 border-black brutal-shadow">
              <button
                onClick={() => setIsAnnual(false)}
                className={`inline-flex items-center px-4 py-2 rounded-full font-black transition-all ${
                  !isAnnual
                    ? "bg-primary text-white"
                    : "text-foreground/60 hover:text-foreground"
                }`}
              >
                MONTHLY
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                className={`inline-flex items-center px-4 py-2 rounded-full font-black transition-all ${
                  isAnnual
                    ? "bg-primary text-white"
                    : "text-foreground/60 hover:text-foreground"
                }`}
              >
                ANNUAL
                <span className="ml-2 inline-flex items-center leading-none h-6 text-xs px-2 py-0.5 bg-accent text-accent-foreground rounded-full">
                  SAVE 25%
                </span>
              </button>
            </div>
          </div>

          {/* Main Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
            {/* Freemium */}
            <Card className="relative hover-lift">
              <CardHeader>
                <CardTitle className="text-3xl font-black">Free</CardTitle>
                <CardDescription className="text-base">Perfect for trying out</CardDescription>
                <div className="pt-4">
                  <span className="text-5xl font-black">FREE</span>
                </div>
                <div className="text-sm font-medium text-muted-foreground pt-2">
                  500 tokens included
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">500 tokens</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Watermark on videos</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Limited access</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Basic support</span>
                  </li>
                </ul>
                <Button className="w-full font-bold" variant="outline" onClick={() => navigate("/auth")}>
                  START FREE
                </Button>
              </CardContent>
            </Card>

            {/* Creators - Most Popular */}
            <Card className="relative hover-lift ring-4 ring-primary scale-105">
              <div className="absolute z-20 -top-4 left-1/2 -translate-x-1/2 bg-primary px-4 py-1 rounded-full border-3 border-black brutal-shadow text-sm font-black text-white">
                MOST POPULAR
              </div>
              <CardHeader>
                <CardTitle className="text-3xl font-black">Creators</CardTitle>
                <CardDescription className="text-base">Best for most users</CardDescription>
                <div className="pt-4">
                  {isAnnual ? (
                    <div className="space-y-1">
                      <div className="text-2xl font-bold line-through text-muted-foreground">$9.99</div>
                      <div>
                        <span className="text-5xl font-black">$7.99</span>
                        <span className="text-muted-foreground font-bold">/mo</span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span className="text-5xl font-black">$9.99</span>
                      <span className="text-muted-foreground font-bold">/mo</span>
                    </div>
                  )}
                </div>
                <div className="text-sm font-medium text-muted-foreground pt-2">
                  10,000 tokens • $0.0008 per token
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">10,000 tokens</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">No watermark</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Global availability</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Priority rendering</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Advanced features</span>
                  </li>
                </ul>
                <Button className="w-full font-bold" onClick={() => navigate("/auth")}>
                  GET STARTED
                </Button>
              </CardContent>
            </Card>

            {/* Ultimate */}
            <Card className="relative hover-lift">
              <CardHeader>
                <CardTitle className="text-3xl font-black">Ultimate</CardTitle>
                <CardDescription className="text-base">For power users</CardDescription>
                <div className="pt-4">
                  {isAnnual ? (
                    <div className="space-y-1">
                      <div className="text-2xl font-bold line-through text-muted-foreground">$49.99</div>
                      <div>
                        <span className="text-5xl font-black">$39.99</span>
                        <span className="text-muted-foreground font-bold">/mo</span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span className="text-5xl font-black">$49.99</span>
                      <span className="text-muted-foreground font-bold">/mo</span>
                    </div>
                  )}
                </div>
                <div className="text-sm font-medium text-muted-foreground pt-2">
                  75,000 tokens • $0.00053 per token
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">75,000 tokens</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">No watermark</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Commercial license</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">Fastest rendering</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">API access</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">24/7 premium support</span>
                  </li>
                </ul>
                <Button className="w-full font-bold" variant="outline" onClick={() => navigate("/auth")}>
                  GET STARTED
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* All Plans Comparison */}
          <div className="max-w-6xl mx-auto mb-16">
            <h3 className="text-3xl font-black text-center mb-8">Compare All Plans</h3>
            <Card className="brutal-card">
              <CardContent className="p-6 md:p-8">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-black">
                        <th className="py-4 px-4 text-left font-black">Plan</th>
                        <th className="py-4 px-4 text-center font-black">Price</th>
                        <th className="py-4 px-4 text-center font-black">Tokens</th>
                        <th className="py-4 px-4 text-center font-black">Best For</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plans.map((plan) => (
                        <tr key={plan.name} className="border-b border-border">
                          <td className="py-4 px-4 font-bold">{plan.name}</td>
                          <td className="py-4 px-4 text-center font-medium">
                            {plan.monthlyPrice === "FREE" ? "FREE" : isAnnual ? plan.annualPrice + "/mo" : plan.monthlyPrice + "/mo"}
                          </td>
                          <td className="py-4 px-4 text-center text-muted-foreground">{plan.tokens}</td>
                          <td className="py-4 px-4 text-center text-sm text-muted-foreground">
                            {plan.name === "Freemium" && "Testing & trying"}
                            {plan.name === "Explorer" && "APAC/LATAM entry"}
                            {plan.name === "Creators" && "Most users"}
                            {plan.name === "Professional" && "Small teams"}
                            {plan.name === "Ultimate" && "Power users"}
                            {plan.name === "Veo Connoisseur" && "Agencies"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Competitor Comparison */}
          <div className="max-w-4xl mx-auto mb-16">
            <h3 className="text-3xl font-black text-center mb-8">Why Choose Artifio.ai?</h3>
            <Card className="brutal-card">
              <CardContent className="p-6 md:p-8">
                <div className="overflow-x-auto">
                  <table className="w-full text-center">
                    <thead>
                      <tr className="border-b-2 border-black">
                        <th className="py-3 px-4 font-black">Feature</th>
                        <th className="py-3 px-4 font-black text-primary">Artifio.ai</th>
                        <th className="py-3 px-4 font-bold text-muted-foreground">Midjourney</th>
                        <th className="py-3 px-4 font-bold text-muted-foreground">Runway</th>
                        <th className="py-3 px-4 font-bold text-muted-foreground">Jasper.ai</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border">
                        <td className="py-3 px-4 font-medium">Starting Price</td>
                        <td className="py-3 px-4 font-black text-primary">$3.99/mo</td>
                        <td className="py-3 px-4">$10/mo</td>
                        <td className="py-3 px-4">$15/mo</td>
                        <td className="py-3 px-4">$39/mo</td>
                      </tr>
                      <tr className="border-b border-border">
                        <td className="py-3 px-4 font-medium">Free Tier</td>
                        <td className="py-3 px-4 font-black text-primary">✅ 500 tokens</td>
                        <td className="py-3 px-4">❌</td>
                        <td className="py-3 px-4">❌</td>
                        <td className="py-3 px-4">❌</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-medium">Video Creation</td>
                        <td className="py-3 px-4 font-black text-primary">✅</td>
                        <td className="py-3 px-4">❌</td>
                        <td className="py-3 px-4">✅</td>
                        <td className="py-3 px-4">❌</td>
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
      </div>
    </div>
  );
};

export default Pricing;
