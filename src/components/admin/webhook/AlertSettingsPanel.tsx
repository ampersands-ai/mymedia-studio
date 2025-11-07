import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Mail, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface AlertSettings {
  enabled: boolean;
  failure_rate_threshold: number;
  storage_failure_threshold: number;
  check_interval_minutes: number;
  admin_emails: string[];
  cooldown_minutes: number;
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

        {/* Email Configuration */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Admin Email Addresses
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Emails that will receive alert notifications
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => testAlertMutation.mutate()}
              disabled={testAlertMutation.isPending || settings.admin_emails.length === 0}
            >
              {testAlertMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Test Alert"
              )}
            </Button>
          </div>

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
        </div>
      </CardContent>
    </Card>
  );
};
