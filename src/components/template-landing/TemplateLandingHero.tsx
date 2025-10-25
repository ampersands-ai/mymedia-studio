import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Coins } from "lucide-react";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";

interface TemplateLandingHeroProps {
  title: string;
  subtitle: string | null;
  beforeImage: string | null;
  afterImage: string | null;
  tokenCost: number | null;
  useCount: number;
  onTryTemplate: () => void;
}

export function TemplateLandingHero({
  title,
  subtitle,
  beforeImage,
  afterImage,
  tokenCost,
  useCount,
  onTryTemplate,
}: TemplateLandingHeroProps) {
  return (
    <section className="py-16 px-4">
      <div className="container max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xl text-muted-foreground">{subtitle}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              {useCount > 0 && (
                <Badge variant="secondary" className="px-4 py-2">
                  <Users className="w-4 h-4 mr-2" />
                  Used {useCount.toLocaleString()}+ times
                </Badge>
              )}
              {tokenCost && (
                <Badge variant="outline" className="px-4 py-2">
                  <Coins className="w-4 h-4 mr-2" />
                  {tokenCost} tokens
                </Badge>
              )}
            </div>

            <Button
              size="lg"
              onClick={onTryTemplate}
              className="text-lg px-8 py-6"
            >
              Try This Template Free
            </Button>

            <p className="text-sm text-muted-foreground">
              No credit card required • Start creating in seconds
            </p>
          </div>

          <div className="relative">
            {beforeImage && afterImage ? (
              <BeforeAfterSlider
                beforeImage={beforeImage}
                afterImage={afterImage}
                beforeLabel="Before"
                afterLabel="After"
              />
            ) : afterImage ? (
              <img
                src={afterImage}
                alt={title}
                className="w-full rounded-lg shadow-xl"
              />
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
