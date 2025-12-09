import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Clock, X } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

const sessionLogger = logger.child({ component: 'SessionWarning' });

export const SessionWarning = () => {
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [extending, setExtending] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Session has expired
        sessionLogger.warn('Session expired, redirecting to auth');
        window.location.href = '/auth';
        return;
      }

      const expiresAt = session.expires_at;
      if (!expiresAt) return;

      const expiryTime = expiresAt * 1000; // Convert to milliseconds
      const now = Date.now();
      const remaining = expiryTime - now;

      // Show warning 5 minutes before expiry
      const WARNING_THRESHOLD = 5 * 60 * 1000;
      
      if (remaining <= 0) {
        // Already expired, redirect
        window.location.href = '/auth';
      } else if (remaining < WARNING_THRESHOLD) {
        setShowWarning(true);
        setTimeRemaining(Math.floor(remaining / 1000 / 60)); // Minutes
      } else {
        setShowWarning(false);
      }
    };

    checkSession();
    const interval = setInterval(checkSession, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleExtendSession = async () => {
    setExtending(true);
    const timer = sessionLogger.startTimer('extendSession');
    
    try {
      // Refresh the session directly (no edge function needed)
      const { error } = await supabase.auth.refreshSession();
      
      if (error) throw error;
      
      timer.end({ success: true });
      sessionLogger.info('Session extended successfully');
      setShowWarning(false);
    } catch (error) {
      sessionLogger.error('Failed to extend session', error as Error);
      toast.error('Failed to extend session. Please save your work and log in again.');
    } finally {
      setExtending(false);
    }
  };

  if (!showWarning) return null;

  const minutes = Math.floor(timeRemaining);
  const seconds = Math.round((timeRemaining - minutes) * 60);

  return (
    <Alert className="mb-4 border-orange-500/50 bg-orange-500/10">
      <Clock className="h-4 w-4 text-orange-500" />
      <AlertDescription className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="font-medium text-orange-500">
            Session expiring in {minutes}:{seconds.toString().padStart(2, '0')}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Your work is being auto-saved. Extend your session to continue working.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleExtendSession}
            disabled={extending}
            size="sm"
            className="shrink-0"
          >
            {extending ? 'Extending...' : 'Stay Logged In'}
          </Button>
          <Button
            onClick={() => setShowWarning(false)}
            variant="ghost"
            size="sm"
            className="shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};
