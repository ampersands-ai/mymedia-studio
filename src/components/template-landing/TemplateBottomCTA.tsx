import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Coins, Clock, Shield } from "lucide-react";

interface TemplateBottomCTAProps {
  title: string;
  tokenCost: number | null;
  onTryTemplate: () => void;
}

export function TemplateBottomCTA({ title, tokenCost, onTryTemplate }: TemplateBottomCTAProps) {
  return (
    <section className="py-20 px-4 bg-gradient-to-br from-primary/10 via-primary/5 to-background">
      <div className="container max-w-4xl mx-auto text-center space-y-8">
        <div className="space-y-4">
          <h2 className="text-4xl font-bold">
            Ready to Create {title}?
          </h2>
          <p className="text-xl text-muted-foreground">
            Start generating professional content in seconds
          </p>
        </div>

        {tokenCost && (
          <Badge variant="secondary" className="px-6 py-3 text-lg">
            <Coins className="w-5 h-5 mr-2" />
            Only {Number(tokenCost).toFixed(2)} credits per creation
          </Badge>
        )}

        <Button
          size="lg"
          onClick={onTryTemplate}
          className="text-xl px-12 py-8"
        >
          <Sparkles className="w-6 h-6 mr-2" />
          Try This Template Free
        </Button>

        <div className="grid md:grid-cols-3 gap-8 mt-12 pt-12 border-t">
          <div className="space-y-2">
            <Clock className="w-8 h-8 mx-auto text-primary" />
            <h3 className="font-semibold">Lightning Fast</h3>
            <p className="text-sm text-muted-foreground">
              Generate content in seconds
            </p>
          </div>
          <div className="space-y-2">
            <Shield className="w-8 h-8 mx-auto text-primary" />
            <h3 className="font-semibold">100% Secure</h3>
            <p className="text-sm text-muted-foreground">
              Your data is always protected
            </p>
          </div>
          <div className="space-y-2">
            <Sparkles className="w-8 h-8 mx-auto text-primary" />
            <h3 className="font-semibold">AI-Powered</h3>
            <p className="text-sm text-muted-foreground">
              Cutting-edge AI technology
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
