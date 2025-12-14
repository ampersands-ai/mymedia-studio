import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, FileText, Palette, Video, Layout, ImageIcon, Film, Repeat, CircleUser, Music } from 'lucide-react';

const CREATION_GROUP_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  image_editing: { label: 'Image to Image', icon: <ImageIcon className="h-4 w-4" /> },
  prompt_to_image: { label: 'Text to Image', icon: <Palette className="h-4 w-4" /> },
  prompt_to_video: { label: 'Text to Video', icon: <Film className="h-4 w-4" /> },
  image_to_video: { label: 'Image to Video', icon: <Video className="h-4 w-4" /> },
  video_to_video: { label: 'Video to Video', icon: <Repeat className="h-4 w-4" /> },
  lip_sync: { label: 'Custom Avatar', icon: <CircleUser className="h-4 w-4" /> },
  prompt_to_audio: { label: 'Audio Studio', icon: <Music className="h-4 w-4" /> },
};

export default function FeatureSettings() {
  const { flags, isLoading, toggleFlag } = useFeatureFlags();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">FEATURE SETTINGS</h1>
        <p className="text-muted-foreground">Control which features are available to users</p>
      </div>

      <div className="grid gap-6">
        {/* Templates Section */}
        <Card className="border-3 border-black brutal-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5" />
                <div>
                  <CardTitle>Templates</CardTitle>
                  <CardDescription>Pre-built generation templates</CardDescription>
                </div>
              </div>
              <Switch
                checked={flags.templates.enabled}
                onCheckedChange={(checked) => toggleFlag('templates.enabled', checked)}
              />
            </div>
          </CardHeader>
          {flags.templates.enabled && (
            <CardContent>
              <Separator className="mb-4" />
              <div className="flex items-center justify-between">
                <Label htmlFor="all-templates" className="text-sm">
                  Enable All Templates
                </Label>
                <Switch
                  id="all-templates"
                  checked={flags.templates.all_enabled}
                  onCheckedChange={(checked) => toggleFlag('templates.all_enabled', checked)}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Individual template toggles are managed in the Templates page
              </p>
            </CardContent>
          )}
        </Card>

        {/* Custom Creation Section */}
        <Card className="border-3 border-black brutal-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Palette className="h-5 w-5" />
                <div>
                  <CardTitle>Custom Creation</CardTitle>
                  <CardDescription>AI-powered content generation</CardDescription>
                </div>
              </div>
              <Switch
                checked={flags.custom_creation.enabled}
                onCheckedChange={(checked) => toggleFlag('custom_creation.enabled', checked)}
              />
            </div>
          </CardHeader>
          {flags.custom_creation.enabled && (
            <CardContent>
              <Separator className="mb-4" />
              <div className="space-y-4">
                {Object.entries(CREATION_GROUP_LABELS).map(([key, { label, icon }]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {icon}
                      <Label htmlFor={`group-${key}`} className="text-sm">
                        {label}
                      </Label>
                    </div>
                    <Switch
                      id={`group-${key}`}
                      checked={flags.custom_creation.groups[key as keyof typeof flags.custom_creation.groups]}
                      onCheckedChange={(checked) => toggleFlag(`custom_creation.groups.${key}`, checked)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Faceless Videos Section */}
        <Card className="border-3 border-black brutal-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Video className="h-5 w-5" />
                <div>
                  <CardTitle>Faceless Videos</CardTitle>
                  <CardDescription>Generate professional faceless videos with AI</CardDescription>
                </div>
              </div>
              <Switch
                checked={flags.faceless_videos.enabled}
                onCheckedChange={(checked) => toggleFlag('faceless_videos.enabled', checked)}
              />
            </div>
          </CardHeader>
        </Card>

        {/* Storyboard Section */}
        <Card className="border-3 border-black brutal-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Layout className="h-5 w-5" />
                <div>
                  <CardTitle>Storyboard</CardTitle>
                  <CardDescription>AI-powered storyboard generator</CardDescription>
                </div>
              </div>
              <Switch
                checked={flags.storyboard.enabled}
                onCheckedChange={(checked) => toggleFlag('storyboard.enabled', checked)}
              />
            </div>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
