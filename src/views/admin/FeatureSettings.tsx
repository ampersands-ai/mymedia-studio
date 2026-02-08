import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, Palette, Video, Layout, ImageIcon, Film, Repeat, CircleUser, Music, Clock, Globe, BookOpen, Sparkles, Users, Image } from 'lucide-react';

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
                  <CardTitle className="flex items-center gap-2">
                    Templates
                    {flags.templates.enabled && flags.templates.coming_soon && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                        <Clock className="h-3 w-3 mr-1" />
                        Coming Soon
                      </Badge>
                    )}
                  </CardTitle>
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
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="templates-coming-soon" className="text-sm">
                    Show as "Coming Soon"
                  </Label>
                  <Switch
                    id="templates-coming-soon"
                    checked={flags.templates.coming_soon}
                    onCheckedChange={(checked) => toggleFlag('templates.coming_soon', checked)}
                  />
                </div>
                <Separator />
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
                <p className="text-xs text-muted-foreground">
                  Individual template toggles are managed in the Templates page
                </p>
              </div>
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
                  <CardTitle className="flex items-center gap-2">
                    Custom Creation
                    {flags.custom_creation.enabled && flags.custom_creation.coming_soon && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                        <Clock className="h-3 w-3 mr-1" />
                        Coming Soon
                      </Badge>
                    )}
                  </CardTitle>
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
                {/* Master Coming Soon Toggle */}
                <div className="flex items-center justify-between pb-3 border-b border-muted">
                  <Label htmlFor="custom-creation-coming-soon" className="text-sm">
                    Show entire section as "Coming Soon"
                  </Label>
                  <Switch
                    id="custom-creation-coming-soon"
                    checked={flags.custom_creation.coming_soon}
                    onCheckedChange={(checked) => toggleFlag('custom_creation.coming_soon', checked)}
                  />
                </div>

                <p className="text-sm font-medium">Creation Groups</p>
                
                {Object.entries(CREATION_GROUP_LABELS).map(([key, { label, icon }]) => {
                  const groupKey = key as keyof typeof flags.custom_creation.groups;
                  const group = flags.custom_creation.groups[groupKey];
                  
                  return (
                    <div key={key} className="space-y-2 pl-2 border-l-2 border-muted">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {icon}
                          <Label htmlFor={`group-${key}`} className="text-sm flex items-center gap-2">
                            {label}
                            {group.coming_soon && group.enabled && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0">
                                <Clock className="h-3 w-3 mr-1" />
                                Coming Soon
                              </Badge>
                            )}
                          </Label>
                        </div>
                        <Switch
                          id={`group-${key}`}
                          checked={group.enabled}
                          onCheckedChange={(checked) => toggleFlag(`custom_creation.groups.${key}.enabled`, checked)}
                        />
                      </div>
                      {group.enabled && (
                        <div className="flex items-center justify-between pl-7">
                          <Label htmlFor={`group-${key}-coming-soon`} className="text-xs text-muted-foreground">
                            Show as "Coming Soon"
                          </Label>
                          <Switch
                            id={`group-${key}-coming-soon`}
                            checked={group.coming_soon}
                            onCheckedChange={(checked) => toggleFlag(`custom_creation.groups.${key}.coming_soon`, checked)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
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
                  <CardTitle className="flex items-center gap-2">
                    Faceless Videos
                    {flags.faceless_videos.enabled && flags.faceless_videos.coming_soon && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                        <Clock className="h-3 w-3 mr-1" />
                        Coming Soon
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>Generate professional faceless videos with AI</CardDescription>
                </div>
              </div>
              <Switch
                checked={flags.faceless_videos.enabled}
                onCheckedChange={(checked) => toggleFlag('faceless_videos.enabled', checked)}
              />
            </div>
          </CardHeader>
          {flags.faceless_videos.enabled && (
            <CardContent>
              <Separator className="mb-4" />
              <div className="flex items-center justify-between">
                <Label htmlFor="faceless-coming-soon" className="text-sm">
                  Show as "Coming Soon"
                </Label>
                <Switch
                  id="faceless-coming-soon"
                  checked={flags.faceless_videos.coming_soon}
                  onCheckedChange={(checked) => toggleFlag('faceless_videos.coming_soon', checked)}
                />
              </div>
            </CardContent>
          )}
        </Card>

        {/* Storyboard Section */}
        <Card className="border-3 border-black brutal-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Layout className="h-5 w-5" />
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Storyboard
                    {flags.storyboard.enabled && flags.storyboard.coming_soon && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                        <Clock className="h-3 w-3 mr-1" />
                        Coming Soon
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>AI-powered storyboard generator</CardDescription>
                </div>
              </div>
              <Switch
                checked={flags.storyboard.enabled}
                onCheckedChange={(checked) => toggleFlag('storyboard.enabled', checked)}
              />
            </div>
          </CardHeader>
          {flags.storyboard.enabled && (
            <CardContent>
              <Separator className="mb-4" />
              <div className="flex items-center justify-between">
                <Label htmlFor="storyboard-coming-soon" className="text-sm">
                  Show as "Coming Soon"
                </Label>
                <Switch
                  id="storyboard-coming-soon"
                  checked={flags.storyboard.coming_soon}
                  onCheckedChange={(checked) => toggleFlag('storyboard.coming_soon', checked)}
                />
              </div>
            </CardContent>
          )}
        </Card>

        {/* Public Pages Section */}
        <Card className="border-3 border-black brutal-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5" />
              <div>
                <CardTitle>Public Pages</CardTitle>
                <CardDescription>Control visibility of public-facing pages</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="features-page" className="text-sm">
                    Features Page
                  </Label>
                </div>
                <Switch
                  id="features-page"
                  checked={flags.pages.features.enabled}
                  onCheckedChange={(checked) => toggleFlag('pages.features.enabled', checked)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="blog-page" className="text-sm">
                    Blog Page
                  </Label>
                </div>
                <Switch
                  id="blog-page"
                  checked={flags.pages.blog.enabled}
                  onCheckedChange={(checked) => toggleFlag('pages.blog.enabled', checked)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="community-page" className="text-sm">
                    Community Page
                  </Label>
                </div>
                <Switch
                  id="community-page"
                  checked={flags.pages.community.enabled}
                  onCheckedChange={(checked) => toggleFlag('pages.community.enabled', checked)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Image className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="template-landings-page" className="text-sm">
                    Template Landing Pages
                  </Label>
                </div>
                <Switch
                  id="template-landings-page"
                  checked={flags.pages.templateLandings.enabled}
                  onCheckedChange={(checked) => toggleFlag('pages.templateLandings.enabled', checked)}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Disabled pages will be hidden from navigation. Admins can still access them.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
