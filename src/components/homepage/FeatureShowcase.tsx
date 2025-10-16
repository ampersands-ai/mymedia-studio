import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FeatureShowcaseProps {
  title: string;
  description: string;
  benefits: string[];
  ctaText: string;
  ctaLink: string;
  visual: ReactNode;
  reversed?: boolean;
}

export const FeatureShowcase = ({
  title,
  description,
  benefits,
  ctaText,
  ctaLink,
  visual,
  reversed = false,
}: FeatureShowcaseProps) => {
  return (
    <div
      className={cn(
        "grid md:grid-cols-2 gap-8 md:gap-12 items-center",
        reversed && "md:grid-flow-dense"
      )}
    >
      <div className={cn("space-y-6", reversed && "md:col-start-2")}>
        <h3 className="text-3xl md:text-4xl font-black text-foreground">
          {title}
        </h3>
        <p className="text-lg text-muted-foreground">{description}</p>
        <ul className="space-y-3">
          {benefits.map((benefit, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <span className="text-primary font-black text-xl">✓</span>
              <span className="text-base text-foreground">{benefit}</span>
            </li>
          ))}
        </ul>
        <Button asChild variant="neon" size="lg">
          <a href={ctaLink}>{ctaText}</a>
        </Button>
      </div>
      <div className={cn("brutalist-card p-8", reversed && "md:col-start-1")}>
        {visual}
      </div>
    </div>
  );
};
