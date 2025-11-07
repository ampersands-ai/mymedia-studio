import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Mail, Loader2, MessageSquare } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AlertSettings {
  enabled: boolean;
  failure_rate_threshold: number;
  storage_failure_threshold: number;
  check_interval_minutes: number;
  admin_emails: string[];
  cooldown_minutes: number;
  slack_webhook_url?: string;
  discord_webhook_url?: string;
  enable_email: boolean;
  enable_slack: boolean;
  enable_discord: boolean;
}

export const AlertSettingsPanel = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [emailInput, setEmailInput] = useState("");

  const { data: settings, isLoading } = useQuery({
    queryKey: ['alert-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'webhook_alerts')
        .maybeSingle();

      if (error) throw error;
      
      const defaultSettings: AlertSettings = {
        enabled: false,
        failure_rate_threshold: 20,
        storage_failure_threshold: 5,
        check_interval_minutes: 5,
        admin_emails: [],
        cooldown_minutes: 30,
        slack_webhook_url: '',
        discord_webhook_url: '',
        enable_email: true,
        enable_slack: false,
        enable_discord: false,
      };

      if (!data || !data.setting_value) return defaultSettings;
      return data.setting_value as unknown as AlertSettings;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (newSettings: AlertSettings) => {
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          setting_key: 'webhook_alerts',
          setting_value: newSettings as any,
        }, {
          onConflict: 'setting_key',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-settings'] });
      toast({
        title: "Settings Updated",
        description: "Alert settings have been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUpdateSetting = (key: keyof AlertSettings, value: any) => {
    if (!settings) return;
    updateMutation.mutate({ ...settings, [key]: value });
  };

  const handleAddEmail = () => {
    if (!emailInput.trim() || !settings) return;
    
    const email = emailInput.trim().toLowerCase();
    if (!email.includes('@')) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    if (settings.admin_emails.includes(email)) {
      toast({
        title: "Duplicate Email",
        description: "This email is already in the list.",
        variant: "destructive",
      });
      return;
    }

    updateMutation.mutate({
      ...settings,
      admin_emails: [...settings.admin_emails, email],
    });
    setEmailInput("");
  };

  const handleRemoveEmail = (email: string) => {
    if (!settings) return;
    updateMutation.mutate({
      ...settings,
      admin_emails: settings.admin_emails.filter(e => e !== email),
    });
  };

  const testAlertMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('send-webhook-alert', {
        body: {
          type: 'test',
          message: 'This is a test alert from the webhook monitoring system.',
        },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Test Alert Sent",
        description: "Check your email inbox for the test alert.",
      });
    },
    onError: (error) => {
      toast({
        title: "Test Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading || !settings) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Alert Settings</CardTitle>
              <CardDescription>Configure automated notifications for webhook issues</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) => handleUpdateSetting('enabled', checked)}
            />
            <span className="text-sm font-medium">
              {settings.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Threshold Settings */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Thresholds</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="failure-rate">
                Failure Rate Threshold (%)
              </Label>
              <Input
                id="failure-rate"
                type="number"
                min="0"
                max="100"
                value={settings.failure_rate_threshold}
                onChange={(e) => handleUpdateSetting('failure_rate_threshold', parseInt(e.target.value))}
                disabled={updateMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                Alert when failure rate exceeds this percentage
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="storage-failures">
                Storage Failure Threshold
              </Label>
              <Input
                id="storage-failures"
                type="number"
                min="0"
                value={settings.storage_failure_threshold}
                onChange={(e) => handleUpdateSetting('storage_failure_threshold', parseInt(e.target.value))}
                disabled={updateMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                Alert when storage failures exceed this count
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="check-interval">
                Check Interval (minutes)
              </Label>
              <Input
                id="check-interval"
                type="number"
                min="1"
                max="60"
                value={settings.check_interval_minutes}
                onChange={(e) => handleUpdateSetting('check_interval_minutes', parseInt(e.target.value))}
                disabled={updateMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                How often to check thresholds
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cooldown">
                Alert Cooldown (minutes)
              </Label>
              <Input
                id="cooldown"
                type="number"
                min="5"
                max="1440"
                value={settings.cooldown_minutes}
                onChange={(e) => handleUpdateSetting('cooldown_minutes', parseInt(e.target.value))}
                disabled={updateMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                Minimum time between repeated alerts
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Notification Channels */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Notification Channels
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Configure where alerts should be sent
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => testAlertMutation.mutate()}
              disabled={testAlertMutation.isPending || (!settings.enable_email && !settings.enable_slack && !settings.enable_discord)}
            >
              {testAlertMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Test Alerts"
              )}
            </Button>
          </div>

          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="email" className="gap-2">
                <Mail className="h-4 w-4" />
                Email
              </TabsTrigger>
              <TabsTrigger value="slack" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Slack
              </TabsTrigger>
              <TabsTrigger value="discord" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Discord
              </TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="space-y-4 mt-4">
              <div className="flex items-center justify-between p-3 rounded-md border bg-muted/30">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Email Notifications</p>
                    <p className="text-xs text-muted-foreground">Send alerts via email to admin addresses</p>
                  </div>
                </div>
                <Switch
                  checked={settings.enable_email}
                  onCheckedChange={(checked) => handleUpdateSetting('enable_email', checked)}
                />
              </div>

              {settings.enable_email && (
                <>
                  <div className="flex gap-2">
                    <Input
                      placeholder="admin@example.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddEmail()}
                      disabled={updateMutation.isPending}
                    />
                    <Button
                      onClick={handleAddEmail}
                      disabled={updateMutation.isPending || !emailInput.trim()}
                    >
                      Add
                    </Button>
                  </div>

                  {settings.admin_emails.length > 0 ? (
                    <div className="space-y-2">
                      {settings.admin_emails.map((email) => (
                        <div
                          key={email}
                          className="flex items-center justify-between p-2 rounded-md border bg-muted/30"
                        >
                          <span className="text-sm font-mono">{email}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveEmail(email)}
                            disabled={updateMutation.isPending}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-sm text-muted-foreground border border-dashed rounded-md">
                      No email addresses configured
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="slack" className="space-y-4 mt-4">
              <div className="flex items-center justify-between p-3 rounded-md border bg-muted/30">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Slack Integration</p>
                    <p className="text-xs text-muted-foreground">Send alerts to Slack channel via webhook</p>
                  </div>
                </div>
                <Switch
                  checked={settings.enable_slack}
                  onCheckedChange={(checked) => handleUpdateSetting('enable_slack', checked)}
                />
              </div>

              {settings.enable_slack && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="slack-webhook">Slack Webhook URL</Label>
                    <Input
                      id="slack-webhook"
                      type="url"
                      placeholder="https://hooks.slack.com/services/..."
                      value={settings.slack_webhook_url || ''}
                      onChange={(e) => handleUpdateSetting('slack_webhook_url', e.target.value)}
                      disabled={updateMutation.isPending}
                    />
                    <p className="text-xs text-muted-foreground">
                      Create an incoming webhook in your Slack workspace settings
                    </p>
                  </div>
                  <div className="p-3 rounded-md border bg-blue-500/10 border-blue-500/20">
                    <p className="text-xs text-muted-foreground">
                      <strong>How to get your Slack webhook:</strong><br />
                      1. Go to your Slack workspace settings<br />
                      2. Navigate to Apps → Incoming Webhooks<br />
                      3. Create a new webhook and select a channel<br />
                      4. Copy the webhook URL and paste it here
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="discord" className="space-y-4 mt-4">
              <div className="flex items-center justify-between p-3 rounded-md border bg-muted/30">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Discord Integration</p>
                    <p className="text-xs text-muted-foreground">Send alerts to Discord channel via webhook</p>
                  </div>
                </div>
                <Switch
                  checked={settings.enable_discord}
                  onCheckedChange={(checked) => handleUpdateSetting('enable_discord', checked)}
                />
              </div>

              {settings.enable_discord && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="discord-webhook">Discord Webhook URL</Label>
                    <Input
                      id="discord-webhook"
                      type="url"
                      placeholder="https://discord.com/api/webhooks/..."
                      value={settings.discord_webhook_url || ''}
                      onChange={(e) => handleUpdateSetting('discord_webhook_url', e.target.value)}
                      disabled={updateMutation.isPending}
                    />
                    <p className="text-xs text-muted-foreground">
                      Create a webhook in your Discord server channel settings
                    </p>
                  </div>
                  <div className="p-3 rounded-md border bg-purple-500/10 border-purple-500/20">
                    <p className="text-xs text-muted-foreground">
                      <strong>How to get your Discord webhook:</strong><br />
                      1. Open your Discord server and go to channel settings<br />
                      2. Navigate to Integrations → Webhooks<br />
                      3. Click "New Webhook" and configure it<br />
                      4. Copy the webhook URL and paste it here
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
};
