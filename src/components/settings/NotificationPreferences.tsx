import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Bell, Mail, Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';
import { PushNotificationToggle } from './PushNotificationToggle';


interface NotificationPreferences {
  email_on_completion: boolean;
  push_on_completion: boolean;
  notification_threshold_seconds: number;
  email_on_subscription_change: boolean;
  email_marketing: boolean;
}

export const NotificationPreferences = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_on_completion: false,
    push_on_completion: false,
    notification_threshold_seconds: 60,
    email_on_subscription_change: true,
    email_marketing: true,
  });

  const fetchPreferences = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setPreferences({
          email_on_completion: data.email_on_completion,
          push_on_completion: data.push_on_completion,
          notification_threshold_seconds: data.notification_threshold_seconds,
          email_on_subscription_change: data.email_on_subscription_change ?? true,
          email_marketing: data.email_marketing ?? true,
        });
      }
    } catch (error) {
      logger.error('Notification preferences fetch failed', error as Error, {
        component: 'NotificationPreferences',
        userId: user?.id,
        operation: 'fetchPreferences'
      });
      toast.error('Failed to load notification preferences. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      fetchPreferences();
    }
  }, [user, fetchPreferences]);

  const savePreferences = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: user.id,
          email_on_completion: preferences.email_on_completion,
          push_on_completion: preferences.push_on_completion,
          notification_threshold_seconds: preferences.notification_threshold_seconds,
          email_on_subscription_change: preferences.email_on_subscription_change,
          email_marketing: preferences.email_marketing,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;
      toast.success('Preferences saved successfully');
    } catch (error) {
      logger.error('Notification preferences save failed', error as Error, {
        component: 'NotificationPreferences',
        userId: user?.id,
        preferences,
        operation: 'savePreferences'
      });
      toast.error('Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const thresholdLabels = {
    30: '30 seconds',
    60: '1 minute',
    120: '2 minutes',
    300: '5 minutes',
    600: '10 minutes'
  };

  if (loading) {
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
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Choose how you want to be notified when your generations complete
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email Notifications */}
        <div className="flex items-center justify-between space-x-4 rounded-lg border border-border p-4">
          <div className="flex items-start space-x-4">
            <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <Label htmlFor="email-notify" className="text-base font-medium">
                Email Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive an email when your generation completes
              </p>
            </div>
          </div>
          <Switch
            id="email-notify"
            checked={preferences.email_on_completion}
            onCheckedChange={(checked) => 
              setPreferences(prev => ({ ...prev, email_on_completion: checked }))
            }
          />
        </div>

        {/* Subscription Change Notifications */}
        <div className="flex items-center justify-between space-x-4 rounded-lg border border-border p-4">
          <div className="flex items-start space-x-4">
            <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <Label htmlFor="subscription-notify" className="text-base font-medium">
                Subscription Emails
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive emails about subscription changes, renewals, and cancellations
              </p>
            </div>
          </div>
          <Switch
            id="subscription-notify"
            checked={preferences.email_on_subscription_change}
            onCheckedChange={(checked) => 
              setPreferences(prev => ({ ...prev, email_on_subscription_change: checked }))
            }
          />
        </div>

        {/* Marketing Notifications */}
        <div className="flex items-center justify-between space-x-4 rounded-lg border border-border p-4">
          <div className="flex items-start space-x-4">
            <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <Label htmlFor="marketing-notify" className="text-base font-medium">
                Product Updates
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive emails about new features, tips, and product updates
              </p>
            </div>
          </div>
          <Switch
            id="marketing-notify"
            checked={preferences.email_marketing}
            onCheckedChange={(checked) => 
              setPreferences(prev => ({ ...prev, email_marketing: checked }))
            }
          />
        </div>

        {/* Push Notifications */}
        <PushNotificationToggle />

        {/* Threshold Slider */}
        <div className="space-y-4 rounded-lg border border-border p-4">
          <div>
            <Label className="text-base font-medium">Notification Threshold</Label>
            <p className="text-sm text-muted-foreground mt-1">
              Only notify me for generations that take longer than:
            </p>
          </div>
          
          <div className="space-y-4">
            <Slider
              value={[preferences.notification_threshold_seconds]}
              onValueChange={([value]) => 
                setPreferences(prev => ({ ...prev, notification_threshold_seconds: value }))
              }
              min={30}
              max={600}
              step={30}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>30s</span>
              <span className="font-medium text-foreground">
                {thresholdLabels[preferences.notification_threshold_seconds as keyof typeof thresholdLabels] || 
                 `${Math.floor(preferences.notification_threshold_seconds / 60)}m ${preferences.notification_threshold_seconds % 60}s`}
              </span>
              <span>10m</span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <Button 
          onClick={savePreferences} 
          disabled={saving}
          className="w-full"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Preferences'
          )}
        </Button>

        {/* Info */}
        <p className="text-xs text-muted-foreground text-center">
          Quick generations that complete in less than your threshold won't trigger notifications to avoid spam.
        </p>
      </CardContent>
    </Card>
  );
};
