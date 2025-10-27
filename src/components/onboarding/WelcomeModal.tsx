import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, X } from "lucide-react";
import { useState, useEffect } from "react";
import { getPopularTemplates } from "@/data/popularTemplates";
import { getExamplePrompt } from "@/data/examplePrompts";
import type { ContentTemplate } from "@/hooks/useTemplates";
import { Skeleton } from "@/components/ui/skeleton";

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: ContentTemplate, examplePrompt: string) => void;
}

export const WelcomeModal = ({ isOpen, onClose, onSelectTemplate }: WelcomeModalProps) => {
  const [templates, setTemplates] = useState<ContentTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    setLoading(true);
    const popularTemplates = await getPopularTemplates();
    setTemplates(popularTemplates);
    setLoading(false);
  };

  const handleSelectTemplate = (template: ContentTemplate) => {
    const examplePrompt = getExamplePrompt(template.id);
    onSelectTemplate(template, examplePrompt);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary-500" />
              <DialogTitle className="text-2xl font-bold">Welcome to Artifio.ai!</DialogTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription className="text-base pt-2">
            Get started with 500 free tokens + earn <span className="font-bold text-primary-500">100 bonus tokens</span> by completing your first creation!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <h3 className="text-lg font-semibold">Choose a template to get started:</h3>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-4 space-y-3">
                  <Skeleton className="h-40 w-full rounded-lg" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-10 w-full" />
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {templates.map((template) => (
                <Card 
                  key={template.id} 
                  className="p-4 hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary-500 group"
                  onClick={() => handleSelectTemplate(template)}
                >
                  {template.thumbnail_url && (
                    <div className="relative h-40 mb-3 rounded-lg overflow-hidden bg-neutral-100">
                      <img
                        src={template.thumbnail_url}
                        alt={template.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <h4 className="font-bold text-lg mb-2 group-hover:text-primary-500 transition-colors">
                    {template.name}
                  </h4>
                  <p className="text-sm text-neutral-600 mb-4 line-clamp-2">
                    {template.description || 'Create amazing content with AI'}
                  </p>
                  <Button 
                    className="w-full bg-primary-500 hover:bg-primary-600 text-neutral-900 font-bold"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectTemplate(template);
                    }}
                  >
                    Get Started
                  </Button>
                </Card>
              ))}
            </div>
          )}

          <div className="pt-4 flex justify-center">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="text-neutral-600 hover:text-neutral-900"
            >
              Skip for now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
