import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Shield, Zap, Clock } from "lucide-react";

interface ModelBottomCTAProps {
  modelName: string;
  onTryModel: () => void;
}

export function ModelBottomCTA({ modelName, onTryModel }: ModelBottomCTAProps) {
  const features = [
    {
      icon: Zap,
      title: "Fast Generation",
      description: "Get results in seconds",
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Your data stays safe",
    },
    {
      icon: Clock,
      title: "No Subscriptions",
      description: "Pay only for what you use",
    },
  ];

  return (
    <section className="py-20 px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-primary/10" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />

      <div className="container max-w-4xl mx-auto relative">
        <div className="text-center space-y-8">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>

          {/* Heading */}
          <div className="space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold">
              Ready to Create with {modelName}?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start generating amazing content in seconds. No credit card required for your first generations.
            </p>
          </div>

          {/* CTA Button */}
          <Button
            size="lg"
            onClick={onTryModel}
            className="gap-2 text-lg px-10 py-6 h-auto"
          >
            Start Creating Now
            <ArrowRight className="w-5 h-5" />
          </Button>

          {/* Feature badges */}
          <div className="grid sm:grid-cols-3 gap-6 pt-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex flex-col items-center gap-3 p-4"
              >
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="text-center">
                  <h4 className="font-medium">{feature.title}</h4>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
