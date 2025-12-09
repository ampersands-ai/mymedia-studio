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

interface NotificationPreferences {
  email_on_completion: boolean;
  push_on_completion: boolean;
  notification_threshold_seconds: number;
}

export const NotificationPreferences = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_on_completion: false,
    push_on_completion: false,
    notification_threshold_seconds: 60
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
          notification_threshold_seconds: data.notification_threshold_seconds
        });
      }
    } catch (error) {
      logger.error('Notification preferences fetch failed', error as Error, {
        component: 'NotificationPreferences',
        userId: user?.id,
        operation: 'fetchPreferences'
      });
      toast.error('Failed to load notification preferences');
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
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;
    } catch (error) {
      logger.error('Notification preferences save failed', error as Error, {
        component: 'NotificationPreferences',
        userId: user?.id,
        preferences,
        operation: 'savePreferences'
      });
      toast.error('Failed to save preferences');
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

        {/* Push Notifications (Future) */}
        <div className="flex items-center justify-between space-x-4 rounded-lg border border-border p-4 opacity-50">
          <div className="flex items-start space-x-4">
            <Bell className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <Label className="text-base font-medium">
                Browser Push Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Coming soon - receive instant browser notifications
              </p>
            </div>
          </div>
          <Switch disabled checked={false} />
        </div>

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
