import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { socialMediaTemplates, SocialMediaTemplate } from '@/utils/social-media-templates';
import { Instagram, Facebook, Twitter, Linkedin, Youtube } from 'lucide-react';

interface SocialMediaTemplatesProps {
  onSelectTemplate: (template: SocialMediaTemplate) => void;
}

export function SocialMediaTemplates({ onSelectTemplate }: SocialMediaTemplatesProps) {
  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, React.ReactNode> = {
      Instagram: <Instagram className="h-4 w-4" />,
      Facebook: <Facebook className="h-4 w-4" />,
      'Twitter/X': <Twitter className="h-4 w-4" />,
      LinkedIn: <Linkedin className="h-4 w-4" />,
      YouTube: <Youtube className="h-4 w-4" />,
    };
    return icons[platform] || null;
  };

  const groupedTemplates = socialMediaTemplates.reduce((acc, template) => {
    if (!acc[template.platform]) {
      acc[template.platform] = [];
    }
    acc[template.platform].push(template);
    return acc;
  }, {} as Record<string, SocialMediaTemplate[]>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Social Media Templates</h3>
        <Badge variant="secondary">{socialMediaTemplates.length} templates</Badge>
      </div>

      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-6">
          {Object.entries(groupedTemplates).map(([platform, templates]) => (
            <div key={platform} className="space-y-3">
              <div className="flex items-center gap-2">
                {getPlatformIcon(platform)}
                <h4 className="font-medium text-sm">{platform}</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {templates.map((template) => (
                  <Button
                    key={template.id}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-start gap-2 hover:border-primary transition-all"
                    onClick={() => onSelectTemplate(template)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium text-sm">{template.name}</span>
                      <div
                        className="w-8 h-8 border-2 border-muted-foreground/30 rounded flex-shrink-0"
                        style={{
                          aspectRatio: template.aspectRatio,
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground text-left">
                      {template.description}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="text-xs text-muted-foreground text-center p-2 bg-muted/30 rounded">
        Click a template to auto-crop and add pre-designed text overlays
      </div>
    </div>
  );
}
