import { useEffect } from 'react';
import { useErrorNotifications } from '@/hooks/useErrorNotifications';
import { toast } from 'sonner';
import { AlertCircle, AlertTriangle, Info, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * ErrorNotificationToast Component
 *
 * Automatically displays user-facing error notifications as toast messages
 * Integrates with the centralized error monitoring system
 *
 * Usage: Place in App.tsx or root layout
 * <ErrorNotificationToast />
 */
export function ErrorNotificationToast() {
  const { notifications, markAsShown, dismissNotification } = useErrorNotifications();

  useEffect(() => {
    // Display new notifications that haven't been shown yet
    notifications
      .filter((n) => !n.shown)
      .forEach((notification) => {
        // Get icon based on title/severity
        let icon = <Info className="h-5 w-5" />;
        let variant: 'info' | 'error' | 'warning' = 'info';

        if (notification.title.includes('⚠️') || notification.title.includes('Warning')) {
          icon = <AlertTriangle className="h-5 w-5 text-yellow-600" />;
          variant = 'warning';
        } else if (notification.title.includes('❌') || notification.title.includes('Error')) {
          icon = <XCircle className="h-5 w-5 text-red-600" />;
          variant = 'error';
        } else if (notification.title.includes('Critical')) {
          icon = <AlertCircle className="h-5 w-5 text-red-700" />;
          variant = 'error';
        }

        // Show toast
        const toastId = toast(notification.message, {
          duration: 10000, // 10 seconds
          icon,
          description: notification.title,
          action: notification.action_label && notification.action_url
            ? {
                label: notification.action_label,
                onClick: () => {
                  if (notification.action_url) {
                    window.location.href = notification.action_url;
                  }
                },
              }
            : undefined,
          onDismiss: () => {
            dismissNotification.mutate(notification.id);
          },
          onAutoClose: () => {
            dismissNotification.mutate(notification.id);
          },
          className: variant === 'error'
            ? 'border-red-200 bg-red-50'
            : variant === 'warning'
            ? 'border-yellow-200 bg-yellow-50'
            : '',
        });

        // Mark as shown
        markAsShown.mutate(notification.id);
      });
  }, [notifications, markAsShown, dismissNotification]);

  return null; // This component doesn't render anything itself
}

/**
 * Utility function to manually create user-facing error notifications
 * Can be called from anywhere in the app
 *
 * Example:
 * showErrorNotification({
 *   title: '❌ Generation Failed',
 *   message: 'Unable to generate image. Your credits have been refunded.',
 *   actionLabel: 'Try Again',
 *   actionUrl: '/create'
 * });
 */
export function showErrorNotification(options: {
  title: string;
  message: string;
  severity?: 'error' | 'warning' | 'info';
  actionLabel?: string;
  actionUrl?: string;
}) {
  const icon = options.severity === 'error'
    ? <XCircle className="h-5 w-5 text-red-600" />
    : options.severity === 'warning'
    ? <AlertTriangle className="h-5 w-5 text-yellow-600" />
    : <Info className="h-5 w-5 text-blue-600" />;

  toast(options.message, {
    duration: 8000,
    icon,
    description: options.title,
    action: options.actionLabel && options.actionUrl
      ? {
          label: options.actionLabel,
          onClick: () => {
            window.location.href = options.actionUrl!;
          },
        }
      : undefined,
  });
}
