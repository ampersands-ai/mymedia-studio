import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Save, Send, AlertCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface AdminNotificationSettings {
  enabled: boolean;
  recipient_email: string;
  error_alerts: { enabled: boolean; min_severity: string };
  daily_summary: { enabled: boolean; time: string };
  user_registration: { enabled: boolean };
  generation_errors: { enabled: boolean; threshold: number };
}

export default function EmailSettings() {
  const { execute } = useErrorHandler();
  const [loading, setLoading] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [settings, setSettings] = useState<{ admin_notifications: AdminNotificationSettings }>({
    admin_notifications: {
      enabled: false,
      recipient_email: '',
      error_alerts: { enabled: false, min_severity: 'medium' },
      daily_summary: { enabled: false, time: '08:00' },
      user_registration: { enabled: false },
      generation_errors: { enabled: false, threshold: 10 },
    },
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    await execute(
      async () => {
        const { data, error } = await supabase
          .from('app_settings')
          .select('setting_value')
          .eq('setting_key', 'admin_notifications')
          .single();

        if (error) throw error;
        if (data?.setting_value) {
          setSettings({ admin_notifications: data.setting_value as AdminNotificationSettings });
        }
      },
      {
        showSuccessToast: false,
        errorMessage: 'Failed to load email settings',
        context: {
          component: 'EmailSettings',
          operation: 'loadSettings'
        }
      }
    );
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await execute(
        async () => {
          const { error } = await supabase
            .from('app_settings')
            .update({
              setting_value: settings.admin_notifications,
              updated_at: new Date().toISOString(),
            })
            .eq('setting_key', 'admin_notifications');

          if (error) throw error;
        },
        {
          successMessage: 'Email settings saved successfully',
          errorMessage: 'Failed to save email settings',
          context: {
            component: 'EmailSettings',
            operation: 'handleSave',
            hasRecipient: !!settings.admin_notifications.recipient_email
          }
        }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTestEmail = async () => {
    setTestingEmail(true);
    try {
      await execute(
        async () => {
          const { error } = await supabase.functions.invoke('send-error-alert', {
            body: {
              subject: 'Test Email',
              error_summary: 'This is a test email from the admin panel.',
              error_count: 1,
              severity: 'low',
            },
          });

          if (error) throw error;
        },
        {
          successMessage: 'Test email sent! Check your inbox.',
          errorMessage: 'Failed to send test email',
          context: {
            component: 'EmailSettings',
            operation: 'handleTestEmail',
            recipient: settings.admin_notifications.recipient_email
          }
        }
      );
    } finally {
      setTestingEmail(false);
    }
  };

  const updateSetting = (path: string[], value: unknown) => {
    setSettings((prev) => {
      const newSettings = { ...prev };
      let current: Record<string, unknown> = newSettings.admin_notifications as unknown as Record<string, unknown>;
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]] as Record<string, unknown>;
      }
      current[path[path.length - 1]] = value;
      return newSettings;
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-black mb-2">Email Settings</h1>
        <p className="text-muted-foreground">
          Configure admin email notifications and alerts
        </p>
      </div>

      <Card className="border-3 border-black brutal-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Notifications
          </CardTitle>
          <CardDescription>
            Enable or disable all admin email notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="email-enabled" className="font-bold">
                Enable Email Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Master switch for all email alerts
              </p>
            </div>
            <Switch
              id="email-enabled"
              checked={settings.admin_notifications.enabled}
              onCheckedChange={(checked) => updateSetting(['enabled'], checked)}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="recipient-email">Recipient Email</Label>
            <Input
              id="recipient-email"
              type="email"
              placeholder="admin@example.com"
              value={settings.admin_notifications.recipient_email}
              onChange={(e) => updateSetting(['recipient_email'], e.target.value)}
              disabled={!settings.admin_notifications.enabled}
            />
            <p className="text-xs text-muted-foreground">
              All admin notifications will be sent to this email
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-3 border-black brutal-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Error Alerts
          </CardTitle>
          <CardDescription>
            Real-time notifications for application errors
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="error-alerts" className="font-bold">
                Enable Error Alerts
              </Label>
              <p className="text-sm text-muted-foreground">
                Send immediate alerts for critical errors
              </p>
            </div>
            <Switch
              id="error-alerts"
              checked={settings.admin_notifications.error_alerts.enabled}
              onCheckedChange={(checked) =>
                updateSetting(['error_alerts', 'enabled'], checked)
              }
              disabled={!settings.admin_notifications.enabled}
            />
          </div>

          <div className="space-y-2">
            <Label>Minimum Severity</Label>
            <select
              className="w-full p-2 border rounded"
              value={settings.admin_notifications.error_alerts.min_severity}
              onChange={(e) =>
                updateSetting(['error_alerts', 'min_severity'], e.target.value)
              }
              disabled={
                !settings.admin_notifications.enabled ||
                !settings.admin_notifications.error_alerts.enabled
              }
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-3 border-black brutal-shadow">
        <CardHeader>
          <CardTitle>Daily Error Summary</CardTitle>
          <CardDescription>
            Daily digest of all errors (runs at 8 AM UTC)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="daily-summary" className="font-bold">
                Enable Daily Summary
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive daily error reports every morning
              </p>
            </div>
            <Switch
              id="daily-summary"
              checked={settings.admin_notifications.daily_summary.enabled}
              onCheckedChange={(checked) =>
                updateSetting(['daily_summary', 'enabled'], checked)
              }
              disabled={!settings.admin_notifications.enabled}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-3 border-black brutal-shadow">
        <CardHeader>
          <CardTitle>User Registration Alerts</CardTitle>
          <CardDescription>
            Get notified when new users sign up
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="user-registration" className="font-bold">
                Enable Registration Alerts
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive emails for new user signups
              </p>
            </div>
            <Switch
              id="user-registration"
              checked={settings.admin_notifications.user_registration.enabled}
              onCheckedChange={(checked) =>
                updateSetting(['user_registration', 'enabled'], checked)
              }
              disabled={!settings.admin_notifications.enabled}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-3 border-black brutal-shadow">
        <CardHeader>
          <CardTitle>Generation Error Alerts</CardTitle>
          <CardDescription>
            Alert when generation failures exceed threshold
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="generation-errors" className="font-bold">
                Enable Generation Error Alerts
              </Label>
              <p className="text-sm text-muted-foreground">
                Alert when too many generations fail
              </p>
            </div>
            <Switch
              id="generation-errors"
              checked={settings.admin_notifications.generation_errors.enabled}
              onCheckedChange={(checked) =>
                updateSetting(['generation_errors', 'enabled'], checked)
              }
              disabled={!settings.admin_notifications.enabled}
            />
          </div>

          <div className="space-y-2">
            <Label>Failure Threshold</Label>
            <Input
              type="number"
              min="1"
              value={settings.admin_notifications.generation_errors.threshold}
              onChange={(e) =>
                updateSetting(
                  ['generation_errors', 'threshold'],
                  parseInt(e.target.value)
                )
              }
              disabled={
                !settings.admin_notifications.enabled ||
                !settings.admin_notifications.generation_errors.enabled
              }
            />
            <p className="text-xs text-muted-foreground">
              Alert after this many failed generations in 1 hour
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {loading ? 'Saving...' : 'Save Settings'}
        </Button>

        <Button
          variant="outline"
          onClick={handleTestEmail}
          disabled={
            testingEmail ||
            !settings.admin_notifications.enabled ||
            !settings.admin_notifications.recipient_email
          }
          className="flex items-center gap-2"
        >
          <Send className="h-4 w-4" />
          {testingEmail ? 'Sending...' : 'Send Test Email'}
        </Button>
      </div>
    </div>
  );
}
