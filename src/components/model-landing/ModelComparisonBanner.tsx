import { Button } from "@/components/ui/button";
import { Sparkles, TrendingDown, ArrowRight } from "lucide-react";

interface ModelComparisonBannerProps {
  modelName: string;
  pricingNote?: string | null;
  onTryModel: () => void;
}

export function ModelComparisonBanner({ modelName, pricingNote, onTryModel }: ModelComparisonBannerProps) {
  return (
    <section className="py-12 px-4">
      <div className="container max-w-4xl mx-auto">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-secondary/10 p-8 md:p-12">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-48 h-48 bg-secondary/10 rounded-full blur-3xl" />
          
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-sm font-medium">
                <TrendingDown className="w-4 h-4" />
                Save Money with ARTIFIO
              </div>
              
              <h3 className="text-2xl md:text-3xl font-bold">
                Access {modelName} at a Fraction of the Cost
              </h3>
              
              {pricingNote ? (
                <p className="text-muted-foreground text-lg">
                  {pricingNote}
                </p>
              ) : (
                <p className="text-muted-foreground text-lg">
                  Use premium AI models without expensive subscriptions. Pay only for what you generate.
                </p>
              )}
            </div>

            <Button
              size="lg"
              onClick={onTryModel}
              className="gap-2 whitespace-nowrap"
            >
              <Sparkles className="w-5 h-5" />
              Try {modelName} Now
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
