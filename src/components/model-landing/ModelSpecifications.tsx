import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings2, Clock, Maximize2, Film, Palette, Layers } from "lucide-react";

interface ModelSpecificationsProps {
  specifications: Record<string, unknown>;
  category?: string;
}

export function ModelSpecifications({ specifications, category }: ModelSpecificationsProps) {
  if (!specifications || Object.keys(specifications).length === 0) return null;

  const getSpecIcon = (key: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      resolutions: <Maximize2 className="w-5 h-5" />,
      aspect_ratios: <Layers className="w-5 h-5" />,
      max_duration: <Film className="w-5 h-5" />,
      generation_time: <Clock className="w-5 h-5" />,
      styles: <Palette className="w-5 h-5" />,
    };
    return iconMap[key] || <Settings2 className="w-5 h-5" />;
  };

  const formatKey = (key: string) => {
    return key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const formatValue = (value: unknown): React.ReactNode => {
    if (Array.isArray(value)) {
      return (
        <div className="flex flex-wrap gap-2">
          {value.map((item, index) => (
            <Badge key={index} variant="secondary">
              {String(item)}
            </Badge>
          ))}
        </div>
      );
    }
    if (typeof value === "boolean") {
      return (
        <Badge variant={value ? "default" : "outline"}>
          {value ? "Yes" : "No"}
        </Badge>
      );
    }
    return <span className="text-foreground">{String(value)}</span>;
  };

  return (
    <section className="py-16 px-4">
      <div className="container max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Technical Specifications</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know about this model's capabilities
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5" />
              Model Specs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-6">
              {Object.entries(specifications).map(([key, value]) => (
                <div 
                  key={key}
                  className="flex items-start gap-4 p-4 rounded-lg bg-muted/50"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    {getSpecIcon(key)}
                  </div>
                  <div className="space-y-1 flex-1">
                    <h4 className="font-medium text-sm text-muted-foreground">
                      {formatKey(key)}
                    </h4>
                    <div className="text-sm">
                      {formatValue(value)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
