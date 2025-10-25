import { OptimizedImage } from "@/components/ui/optimized-image";
import { Card } from "@/components/ui/card";

interface Example {
  url: string;
  caption?: string;
  settings?: string;
}

interface TemplateExampleGalleryProps {
  examples: Example[] | null;
}

export function TemplateExampleGallery({ examples }: TemplateExampleGalleryProps) {
  if (!examples || examples.length === 0) return null;

  return (
    <section className="py-16 px-4 bg-muted/30">
      <div className="container max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Example Results</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            See what you can create with this template
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {examples.map((example, index) => (
            <Card key={index} className="overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow">
              <div className="aspect-video relative overflow-hidden">
                <OptimizedImage
                  src={example.url}
                  alt={example.caption || `Example ${index + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              {(example.caption || example.settings) && (
                <div className="p-4 space-y-2">
                  {example.caption && (
                    <p className="font-medium text-sm">{example.caption}</p>
                  )}
                  {example.settings && (
                    <p className="text-xs text-muted-foreground">{example.settings}</p>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
