import { Card, CardContent } from "@/components/ui/card";
import * as LucideIcons from "lucide-react";
import type { UseCaseItem } from "@/hooks/useModelPages";

interface ModelUseCasesProps {
  useCases: UseCaseItem[];
}

export function ModelUseCases({ useCases }: ModelUseCasesProps) {
  if (!useCases || useCases.length === 0) return null;

  const getIcon = (iconName?: string) => {
    if (!iconName) return <LucideIcons.Lightbulb className="w-6 h-6" />;
    
    const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
    const IconComponent = icons[iconName];
    if (IconComponent) {
      return <IconComponent className="w-6 h-6" />;
    }
    return <LucideIcons.Lightbulb className="w-6 h-6" />;
  };

  return (
    <section className="py-16 px-4 bg-muted/30">
      <div className="container max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Ideal Use Cases</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Perfect for these creative applications
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {useCases.map((useCase, index) => (
            <Card 
              key={index}
              className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/30"
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-primary">
                    {getIcon(useCase.icon)}
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">{useCase.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {useCase.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
