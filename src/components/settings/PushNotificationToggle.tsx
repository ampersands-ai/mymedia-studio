import { Bell, BellOff, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { cn } from '@/lib/utils';

interface PushNotificationToggleProps {
  className?: string;
}

export const PushNotificationToggle = ({ className }: PushNotificationToggleProps) => {
  const { permission, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications();

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  // Unsupported browser
  if (permission === 'unsupported') {
    return (
      <div className={cn(
        "flex items-center justify-between space-x-4 rounded-lg border border-border p-4 opacity-50",
        className
      )}>
        <div className="flex items-start space-x-4">
          <BellOff className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="space-y-1">
            <Label className="text-base font-medium">
              Browser Push Notifications
            </Label>
            <p className="text-sm text-muted-foreground">
              Push notifications are not supported in this browser
            </p>
          </div>
        </div>
        <Switch disabled checked={false} />
      </div>
    );
  }

  // Permission denied
  if (permission === 'denied') {
    return (
      <div className={cn(
        "flex items-center justify-between space-x-4 rounded-lg border border-destructive/50 bg-destructive/5 p-4",
        className
      )}>
        <div className="flex items-start space-x-4">
          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
          <div className="space-y-1">
            <Label className="text-base font-medium">
              Browser Push Notifications
            </Label>
            <p className="text-sm text-muted-foreground">
              Notifications are blocked. Please enable them in your browser settings.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open('https://support.google.com/chrome/answer/3220216', '_blank')}
        >
          Learn How
        </Button>
      </div>
    );
  }

  // Normal state - can toggle
  return (
    <div className={cn(
      "flex items-center justify-between space-x-4 rounded-lg border border-border p-4 transition-colors",
      isSubscribed && "border-primary/50 bg-primary/5",
      className
    )}>
      <div className="flex items-start space-x-4">
        {isSubscribed ? (
          <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
        ) : (
          <Bell className="h-5 w-5 text-muted-foreground mt-0.5" />
        )}
        <div className="space-y-1">
          <Label htmlFor="push-notify" className="text-base font-medium">
            Browser Push Notifications
          </Label>
          <p className="text-sm text-muted-foreground">
            {isSubscribed 
              ? "You'll receive instant notifications when generations complete"
              : "Get instant notifications even when this tab is closed"
            }
          </p>
        </div>
      </div>
      
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : (
        <Switch
          id="push-notify"
          checked={isSubscribed}
          onCheckedChange={handleToggle}
          disabled={isLoading}
        />
      )}
    </div>
  );
};
