import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";

const plans = [
  {
    name: "Freemium",
    price: "FREE",
    tokens: "500",
    features: [
      "500 tokens included",
      "Watermark on videos",
      "Limited access",
      "Basic support",
    ],
    popular: false,
    color: "bg-muted",
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
    color: "bg-neon-blue",
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
    color: "bg-neon-pink",
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
    color: "bg-primary",
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
    color: "bg-neon-yellow",
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={logo} alt="Artifio Logo" className="h-10 w-10" />
                <h1 className="text-3xl font-black gradient-text">ARTIFIO.AI</h1>
              </div>
              <Button variant="outline" onClick={() => navigate("/")}>
                BACK TO HOME
              </Button>
            </div>
          </div>
        </header>

        {/* Pricing Content */}
        <main className="container mx-auto px-4 py-16">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-6xl font-black">CHOOSE YOUR PLAN</h2>
            <p className="text-2xl text-foreground/80 max-w-2xl mx-auto font-medium">
              Scale your creativity with flexible pricing. Start free, upgrade anytime.
            </p>
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
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary px-4 py-1 rounded-full border-3 border-black brutal-shadow text-sm font-black text-white">
                    MOST POPULAR
                  </div>
                )}
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-neon-yellow px-4 py-1 rounded-full border-3 border-black brutal-shadow text-sm font-black">
                    {plan.badge}
                  </div>
                )}
                <CardHeader className={`${plan.color} ${plan.color !== 'bg-muted' ? 'text-white' : ''}`}>
                  <CardTitle className="text-3xl font-black">{plan.name}</CardTitle>
                  <CardDescription className={`${plan.color !== 'bg-muted' ? 'text-white/80' : ''} font-bold`}>
                    {plan.regions || "Global access"}
                  </CardDescription>
                  <div className="pt-4">
                    <span className="text-5xl font-black">{plan.price}</span>
                    {plan.period && (
                      <span className={`${plan.color !== 'bg-muted' ? 'text-white/80' : 'text-foreground/60'} font-bold`}>{plan.period}</span>
                    )}
                  </div>
                  <div className={`text-sm font-black pt-2 ${plan.color !== 'bg-muted' ? 'text-white' : ''}`}>
                    {plan.tokens} TOKENS
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
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

          <div className="mt-16 text-center">
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
