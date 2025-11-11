import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock } from 'lucide-react';

export const SessionWarning = () => {
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Session has expired
        console.log('[SessionWarning] Session expired, redirecting...');
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

  if (!showWarning) return null;

  return (
    <Alert className="mb-4">
      <Clock className="h-4 w-4" />
      <AlertDescription>
        Your session will expire in {timeRemaining} minute{timeRemaining !== 1 ? 's' : ''}. 
        Your work is being auto-saved.
      </AlertDescription>
    </Alert>
  );
};
