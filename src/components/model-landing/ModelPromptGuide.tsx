import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Copy, Check, ChevronDown, BookOpen, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import type { ModelPromptTemplate } from "@/hooks/useModelPages";

interface ModelPromptGuideProps {
  templates: ModelPromptTemplate[];
  modelName: string;
  onTryPrompt: (prompt: string) => void;
}

export function ModelPromptGuide({ templates, modelName, onTryPrompt }: ModelPromptGuideProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [openCategories, setOpenCategories] = useState<string[]>([]);

  if (!templates || templates.length === 0) return null;

  // Group templates by category
  const templatesByCategory = templates.reduce((acc, template) => {
    const category = template.category || "General";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(template);
    return acc;
  }, {} as Record<string, ModelPromptTemplate[]>);

  const handleCopy = (template: ModelPromptTemplate) => {
    navigator.clipboard.writeText(template.prompt_template);
    setCopiedId(template.id);
    toast.success("Prompt copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleCategory = (category: string) => {
    setOpenCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  return (
    <section className="py-16 px-4">
      <div className="container max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Prompt Templates</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Ready-to-use prompts optimized for {modelName}. Copy and customize for your needs.
          </p>
        </div>

        <div className="space-y-4">
          {Object.entries(templatesByCategory).map(([category, categoryTemplates]) => (
            <Card key={category}>
              <Collapsible
                open={openCategories.includes(category)}
                onOpenChange={() => toggleCategory(category)}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <BookOpen className="w-5 h-5 text-primary" />
                        <span>{category}</span>
                        <Badge variant="secondary">{categoryTemplates.length}</Badge>
                      </div>
                      <ChevronDown 
                        className={`w-5 h-5 transition-transform ${
                          openCategories.includes(category) ? "rotate-180" : ""
                        }`} 
                      />
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4 pt-0">
                    {categoryTemplates.map((template) => (
                      <div
                        key={template.id}
                        className="p-4 rounded-lg border bg-muted/30 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="font-medium">{template.title}</h4>
                            {template.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {template.description}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopy(template)}
                            >
                              {copiedId === template.id ? (
                                <Check className="w-4 h-4" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        
                        <div className="p-3 rounded-md bg-background text-sm font-mono break-words">
                          {template.prompt_template}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onTryPrompt(template.prompt_template)}
                          className="gap-2"
                        >
                          Use This Prompt
                          <ArrowRight className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
