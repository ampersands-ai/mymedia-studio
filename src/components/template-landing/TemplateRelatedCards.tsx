import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins } from "lucide-react";
import { useRouter } from "next/navigation";

interface RelatedTemplate {
  id: string;
  slug: string;
  category_slug: string;
  title: string;
  subtitle: string | null;
  thumbnail_url: string | null;
  token_cost: number | null;
}

interface TemplateRelatedCardsProps {
  templates: RelatedTemplate[] | null;
}

export function TemplateRelatedCards({ templates }: TemplateRelatedCardsProps) {
  const router = useRouter();

  if (!templates || templates.length === 0) return null;

  return (
    <section className="py-16 px-4 bg-muted/30">
      <div className="container max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Related Templates</h2>
          <p className="text-muted-foreground">
            Explore more ways to create amazing content
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {templates.slice(0, 4).map((template) => (
            <Card
              key={template.id}
              className="overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => router.push(`/templates/${template.category_slug}/${template.slug}`)}
            >
              {template.thumbnail_url && (
                <div className="aspect-video relative overflow-hidden bg-muted">
                  <img
                    src={template.thumbnail_url}
                    alt={template.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}
              <div className="p-4 space-y-3">
                <h3 className="font-semibold line-clamp-2">{template.title}</h3>
                {template.subtitle && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {template.subtitle}
                  </p>
                )}
                {template.token_cost && (
                  <Badge variant="outline" className="text-xs">
                    <Coins className="w-3 h-3 mr-1" />
                    {Number(template.token_cost).toFixed(2)} credits
                  </Badge>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
