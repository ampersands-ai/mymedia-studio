import { Settings, Volume2, Download, Bell, HardDrive } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export function SettingsView() {
  const [settings, setSettings] = useState({
    autoPlay: true,
    crossfade: false,
    crossfadeDuration: 5,
    normalizeVolume: true,
    defaultQuality: 'high',
    downloadFormat: 'mp3',
    notifications: true,
    emailNotifications: false,
  });

  const updateSetting = <K extends keyof typeof settings>(key: K, value: typeof settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="animate-fade-in space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
          <Settings className="h-5 w-5 text-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">Customize your audio experience</p>
        </div>
      </div>

      {/* Playback Settings */}
      <Card className="border-2 border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Volume2 className="h-5 w-5 text-primary-orange" />
            Playback
          </CardTitle>
          <CardDescription>Control how audio plays</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="autoplay">Auto-play</Label>
              <p className="text-sm text-muted-foreground">Automatically play next track</p>
            </div>
            <Switch
              id="autoplay"
              checked={settings.autoPlay}
              onCheckedChange={(v) => updateSetting('autoPlay', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="crossfade">Crossfade</Label>
              <p className="text-sm text-muted-foreground">Smooth transition between tracks</p>
            </div>
            <Switch
              id="crossfade"
              checked={settings.crossfade}
              onCheckedChange={(v) => updateSetting('crossfade', v)}
            />
          </div>

          {settings.crossfade && (
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Crossfade Duration</Label>
                <span className="text-sm text-muted-foreground">{settings.crossfadeDuration}s</span>
              </div>
              <Slider
                value={[settings.crossfadeDuration]}
                min={1}
                max={12}
                step={1}
                onValueChange={(v) => updateSetting('crossfadeDuration', v[0])}
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="normalize">Normalize Volume</Label>
              <p className="text-sm text-muted-foreground">Maintain consistent volume levels</p>
            </div>
            <Switch
              id="normalize"
              checked={settings.normalizeVolume}
              onCheckedChange={(v) => updateSetting('normalizeVolume', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Download Settings */}
      <Card className="border-2 border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Download className="h-5 w-5 text-accent-purple" />
            Downloads
          </CardTitle>
          <CardDescription>Export and download preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Audio Quality</Label>
            <Select 
              value={settings.defaultQuality} 
              onValueChange={(v) => updateSetting('defaultQuality', v)}
            >
              <SelectTrigger className="border-2 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low (128 kbps)</SelectItem>
                <SelectItem value="medium">Medium (256 kbps)</SelectItem>
                <SelectItem value="high">High (320 kbps)</SelectItem>
                <SelectItem value="lossless">Lossless (WAV)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Default Format</Label>
            <Select 
              value={settings.downloadFormat} 
              onValueChange={(v) => updateSetting('downloadFormat', v)}
            >
              <SelectTrigger className="border-2 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mp3">MP3</SelectItem>
                <SelectItem value="wav">WAV</SelectItem>
                <SelectItem value="flac">FLAC</SelectItem>
                <SelectItem value="ogg">OGG</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="border-2 border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-primary-yellow" />
            Notifications
          </CardTitle>
          <CardDescription>Manage your alerts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notifications">Push Notifications</Label>
              <p className="text-sm text-muted-foreground">Get notified when generation completes</p>
            </div>
            <Switch
              id="notifications"
              checked={settings.notifications}
              onCheckedChange={(v) => updateSetting('notifications', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="email-notifications">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive updates via email</p>
            </div>
            <Switch
              id="email-notifications"
              checked={settings.emailNotifications}
              onCheckedChange={(v) => updateSetting('emailNotifications', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Storage */}
      <Card className="border-2 border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <HardDrive className="h-5 w-5 text-accent-cyan" />
            Storage
          </CardTitle>
          <CardDescription>Manage your cached data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Cached Audio</p>
              <p className="text-sm text-muted-foreground">12.4 MB used</p>
            </div>
            <Button variant="outline" size="sm" className="border-2">
              Clear Cache
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
