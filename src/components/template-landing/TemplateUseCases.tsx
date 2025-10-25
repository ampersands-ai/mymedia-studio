import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";

interface UseCase {
  title: string;
  description: string;
}

interface TemplateUseCasesProps {
  useCases: UseCase[] | null;
  targetAudience: string[] | null;
}

export function TemplateUseCases({ useCases, targetAudience }: TemplateUseCasesProps) {
  if ((!useCases || useCases.length === 0) && (!targetAudience || targetAudience.length === 0)) {
    return null;
  }

  return (
    <section className="py-16 px-4 bg-muted/30">
      <div className="container max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Perfect For</h2>
          {targetAudience && targetAudience.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {targetAudience.map((audience, index) => (
                <Badge key={index} variant="secondary" className="px-4 py-2">
                  {audience}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {useCases && useCases.length > 0 && (
          <div className="grid md:grid-cols-2 gap-6">
            {useCases.map((useCase, index) => (
              <Card key={index} className="p-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <CheckCircle className="w-6 h-6 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">{useCase.title}</h3>
                    <p className="text-muted-foreground">{useCase.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
