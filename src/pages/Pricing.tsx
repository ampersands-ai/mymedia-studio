import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Sparkles } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

const plans = [
  {
    name: "Freemium",
    price: "FREE",
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
    price: "$3.99",
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
    price: "$7.99",
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
    badge: "BEST FOR BUSINESS",
    description: "The indie creator's choice. 10,000 tokens for just $7.99/mo—competitors charge $30-50 for similar plans.",
    savings: "Save $22-42/mo vs competitors",
  },
  {
    name: "Professional",
    price: "$19.99",
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
    badge: "BEST FOR BUSINESS",
    description: "All the tools you need for less than $20/mo. 32,500 tokens + unlimited image & text. Save $100s every year.",
    savings: "Save $80-105/mo vs competitors",
  },
  {
    name: "Ultimate",
    price: "$39.99",
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
];

const Pricing = () => {
  const navigate = useNavigate();

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
          <div className="text-center space-y-4 mb-8">
            <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neon-blue border-3 border-black brutal-shadow">
                <span className="text-xs font-black text-white">AFFORDABLE & COMPETITIVE</span>
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neon-yellow border-3 border-black brutal-shadow">
                <span className="text-xs font-black">SAVE 50–80% VS COMPETITORS</span>
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary border-3 border-black brutal-shadow">
                <span className="text-xs font-black text-white">BEST VALUE FOR CREATORS</span>
              </div>
            </div>
            <h2 className="text-5xl md:text-6xl font-black">AI for Everyone — Plans Starting at Just $3.99</h2>
            <p className="text-xl md:text-2xl text-foreground/80 max-w-3xl mx-auto font-medium">
              Other AI tools cost $20–$50/month. Artifio.ai gives you the same power for a fraction of the price.
            </p>
          </div>

          {/* Price Comparison Table */}
          <div className="max-w-4xl mx-auto mb-16">
            <Card className="brutal-card bg-card">
              <CardContent className="p-6 md:p-8">
                <h3 className="text-2xl md:text-3xl font-black text-center mb-6">Compare Prices</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-center">
                    <thead>
                      <tr className="border-b-2 border-black">
                        <th className="py-3 px-2 md:px-4 font-black text-sm md:text-base">Feature</th>
                        <th className="py-3 px-2 md:px-4 font-black text-primary text-sm md:text-base">Artifio.ai</th>
                        <th className="py-3 px-2 md:px-4 font-bold text-foreground/60 text-sm md:text-base">Midjourney</th>
                        <th className="py-3 px-2 md:px-4 font-bold text-foreground/60 text-sm md:text-base">Runway</th>
                        <th className="py-3 px-2 md:px-4 font-bold text-foreground/60 text-sm md:text-base">Jasper.ai</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-black/20">
                        <td className="py-3 px-2 md:px-4 font-medium text-sm md:text-base">Starting Price</td>
                        <td className="py-3 px-2 md:px-4 font-black text-primary text-sm md:text-base">$3.99/mo</td>
                        <td className="py-3 px-2 md:px-4 text-sm md:text-base">$10/mo</td>
                        <td className="py-3 px-2 md:px-4 text-sm md:text-base">$15/mo</td>
                        <td className="py-3 px-2 md:px-4 text-sm md:text-base">$39/mo</td>
                      </tr>
                      <tr className="border-b border-black/20">
                        <td className="py-3 px-2 md:px-4 font-medium text-sm md:text-base">Best Plan Value</td>
                        <td className="py-3 px-2 md:px-4 font-black text-primary text-sm md:text-base">$39.99/mo</td>
                        <td className="py-3 px-2 md:px-4 text-sm md:text-base">$60/mo</td>
                        <td className="py-3 px-2 md:px-4 text-sm md:text-base">$95/mo</td>
                        <td className="py-3 px-2 md:px-4 text-sm md:text-base">$125/mo</td>
                      </tr>
                      <tr className="border-b border-black/20">
                        <td className="py-3 px-2 md:px-4 font-medium text-sm md:text-base">Free Tier</td>
                        <td className="py-3 px-2 md:px-4 font-black text-primary text-sm md:text-base">✅ 500 tokens</td>
                        <td className="py-3 px-2 md:px-4 text-sm md:text-base">❌</td>
                        <td className="py-3 px-2 md:px-4 text-sm md:text-base">❌</td>
                        <td className="py-3 px-2 md:px-4 text-sm md:text-base">❌</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-2 md:px-4 font-medium text-sm md:text-base">Video Creation</td>
                        <td className="py-3 px-2 md:px-4 font-black text-primary text-sm md:text-base">✅</td>
                        <td className="py-3 px-2 md:px-4 text-sm md:text-base">❌</td>
                        <td className="py-3 px-2 md:px-4 text-sm md:text-base">✅</td>
                        <td className="py-3 px-2 md:px-4 text-sm md:text-base">❌</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 max-w-7xl mx-auto">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative hover-lift ${
                  plan.popular ? "ring-4 ring-primary scale-105" : ""
                }`}
              >
                {plan.popular && (
                  <div className="absolute z-20 -top-4 left-1/2 -translate-x-1/2 bg-primary px-4 py-1 rounded-full border-3 border-black brutal-shadow text-sm font-black text-white">
                    MOST POPULAR
                  </div>
                )}
                {plan.badge && !plan.popular && (
                  <div className="absolute z-20 -top-4 left-1/2 -translate-x-1/2 bg-neon-yellow px-4 py-1 rounded-full border-3 border-black brutal-shadow text-sm font-black text-black">
                    {plan.badge}
                  </div>
                )}
                <CardHeader className={`${plan.color} ${plan.color !== 'bg-muted' ? 'text-white' : ''}`}>
                  <CardTitle className="text-3xl font-black">{plan.name}</CardTitle>
                  <CardDescription className={`${plan.color !== 'bg-muted' ? 'text-white' : ''} font-bold`}>
                    {plan.regions || "Global access"}
                  </CardDescription>
                  <div className="pt-4">
                    <span className="text-5xl font-black">{plan.price}</span>
                    {plan.period && (
                      <span className={`${plan.color !== 'bg-muted' ? 'text-white' : 'text-foreground/60'} font-bold`}>{plan.period}</span>
                    )}
                  </div>
                  <div className={`text-sm font-black pt-2 ${plan.color !== 'bg-muted' ? 'text-white' : ''}`}>
                    {plan.tokens} TOKENS
                  </div>
                  {plan.perToken && (
                    <div className={`text-xs font-bold pt-1 ${plan.color !== 'bg-muted' ? 'text-white' : 'text-foreground/60'}`}>
                      💰 {plan.perToken}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  {plan.description && (
                    <p className="text-sm font-medium text-foreground/80 pb-2">
                      {plan.description}
                    </p>
                  )}
                  {plan.savings && (
                    <div className="bg-accent/20 border-2 border-accent rounded-lg px-3 py-2 mb-4">
                      <p className="text-sm font-black text-center">
                        💰 {plan.savings}
                      </p>
                    </div>
                  )}
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm font-medium">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full ${
                      plan.popular
                        ? ""
                        : ""
                    }`}
                    variant={plan.popular ? "neon" : "outline"}
                    size="lg"
                    onClick={() => navigate("/auth")}
                  >
                    {plan.price === "FREE" ? "GET STARTED" : "SUBSCRIBE"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Social Proof Section */}
          <div className="mt-16 max-w-4xl mx-auto">
            <Card className="brutal-card bg-gradient-primary">
              <CardContent className="p-8 md:p-12 text-center space-y-4">
                <h3 className="text-3xl md:text-4xl font-black text-white">Join 10,000+ Creators Who Switched to Save Money</h3>
                <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
                  <div className="px-6 py-3 bg-white/90 backdrop-blur-0 rounded-full border-2 border-white text-foreground">
                    <span className="font-black text-sm">COMPETITIVE PRICES</span>
                  </div>
                  <div className="px-6 py-3 bg-white/90 backdrop-blur-0 rounded-full border-2 border-white text-foreground">
                    <span className="font-black text-sm">NO HIDDEN FEES</span>
                  </div>
                  <div className="px-6 py-3 bg-white/90 backdrop-blur-0 rounded-full border-2 border-white text-foreground">
                    <span className="font-black text-sm">GLOBAL ACCESS</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12 text-center space-y-4">
            <p className="text-foreground/80 font-medium text-lg max-w-3xl mx-auto">
              <span className="font-black gradient-text">Our Mission:</span> Make AI content creation accessible and affordable for everyone—not just big-budget studios.
            </p>
            <p className="text-foreground/80 font-medium text-lg">
              All plans include access to our AI playground. Enterprise solutions available.{" "}
              <a href="#" className="text-primary hover:text-primary/80 font-bold underline">
                Contact us
              </a>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Pricing;
