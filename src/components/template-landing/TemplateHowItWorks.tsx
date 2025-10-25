import { Card } from "@/components/ui/card";
import * as Icons from "lucide-react";

interface Step {
  title: string;
  description: string;
  icon?: string;
}

interface TemplateHowItWorksProps {
  steps: Step[] | null;
  demoVideoUrl?: string | null;
}

export function TemplateHowItWorks({ steps, demoVideoUrl }: TemplateHowItWorksProps) {
  if (!steps || steps.length === 0) return null;

  return (
    <section className="py-16 px-4">
      <div className="container max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">How It Works</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Simple steps to create amazing content
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {steps.map((step, index) => {
            const IconComponent = step.icon && (Icons as any)[step.icon] 
              ? (Icons as any)[step.icon] 
              : Icons.CircleDot;

            return (
              <Card key={index} className="p-6 text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary">
                  <IconComponent className="w-8 h-8" />
                </div>
                <div className="text-2xl font-bold text-muted-foreground">
                  {index + 1}
                </div>
                <h3 className="text-xl font-semibold">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </Card>
            );
          })}
        </div>

        {demoVideoUrl && (
          <div className="aspect-video max-w-4xl mx-auto rounded-lg overflow-hidden shadow-xl">
            <iframe
              src={demoVideoUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
      </div>
    </section>
  );
}
