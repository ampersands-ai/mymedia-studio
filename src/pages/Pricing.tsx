import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const plans = [
  {
    name: "Freemium",
    price: "Free",
    tokens: "500",
    features: [
      "500 tokens included",
      "Watermark on videos",
      "Limited access",
      "Basic support",
    ],
    popular: false,
  },
  {
    name: "Explorer",
    price: "$3.99",
    period: "/mo",
    tokens: "4,000",
    features: [
      "4,000 tokens",
      "No watermark",
      "Regional access (APAC/LATAM)",
      "Priority support",
    ],
    popular: false,
    regions: "APAC/LATAM only",
  },
  {
    name: "Creators",
    price: "$7.99",
    period: "/mo",
    tokens: "10,000",
    features: [
      "10,000 tokens",
      "No watermark",
      "Global availability",
      "Priority rendering",
      "Advanced features",
    ],
    popular: true,
  },
  {
    name: "Professional",
    price: "$19.99",
    period: "/mo",
    tokens: "32,500",
    features: [
      "32,500 tokens",
      "No watermark",
      "Unlimited image & text gens",
      "Priority rendering",
      "API access",
      "Dedicated support",
    ],
    popular: false,
  },
  {
    name: "Ultimate",
    price: "$39.99",
    period: "/mo",
    tokens: "75,000",
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
    badge: "Best Value",
  },
];

const Pricing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,hsl(270_80%_65%/0.15),transparent_70%)]" />
      
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-border/50 backdrop-blur-xl bg-background/50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold glow-text">Artifio.ai</h1>
              </div>
              <Button variant="ghost" onClick={() => navigate("/")}>
                Back to Home
              </Button>
            </div>
          </div>
        </header>

        {/* Pricing Content */}
        <main className="container mx-auto px-4 py-16">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-5xl font-bold">Choose Your Plan</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Scale your creativity with flexible pricing. Start free, upgrade anytime.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 max-w-7xl mx-auto">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`glass-card relative ${
                  plan.popular ? "glow-border ring-2 ring-primary" : ""
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-primary px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </div>
                )}
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-accent px-4 py-1 rounded-full text-sm font-semibold">
                    {plan.badge}
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>
                    {plan.regions || "Global access"}
                  </CardDescription>
                  <div className="pt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.period && (
                      <span className="text-muted-foreground">{plan.period}</span>
                    )}
                  </div>
                  <div className="text-sm text-primary font-semibold pt-2">
                    {plan.tokens} tokens
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full ${
                      plan.popular
                        ? "bg-gradient-primary hover:opacity-90"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                    onClick={() => navigate("/auth")}
                  >
                    {plan.price === "Free" ? "Get Started" : "Subscribe"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-16 text-center">
            <p className="text-muted-foreground">
              All plans include access to our AI playground. Enterprise solutions available.{" "}
              <a href="#" className="text-primary hover:text-primary-glow">
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
