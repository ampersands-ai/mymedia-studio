import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';

export type PushPermissionState = 'prompt' | 'granted' | 'denied' | 'unsupported';

interface UsePushNotificationsReturn {
  permission: PushPermissionState;
  isSubscribed: boolean;
  isLoading: boolean;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  checkSubscription: () => Promise<void>;
}

/**
 * Hook for managing Web Push Notifications
 * Handles permission requests, subscription management, and database storage
 */
export function usePushNotifications(): UsePushNotificationsReturn {
  const { user } = useAuth();
  const [permission, setPermission] = useState<PushPermissionState>('prompt');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if push notifications are supported
  const isPushSupported = useCallback(() => {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }, []);

  // Get VAPID public key from backend
  const getVapidPublicKey = useCallback(async (): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('get-vapid-keys');
      
      if (error) {
        throw error;
      }

      return data?.publicKey || null;
    } catch (error) {
      logger.error('Failed to fetch VAPID public key', error as Error, {
        component: 'usePushNotifications',
        operation: 'getVapidPublicKey',
      });
      return null;
    }
  }, []);

  // Convert base64 to Uint8Array for applicationServerKey
  const urlBase64ToUint8Array = useCallback((base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
  }, []);

  // Check current subscription status
  const checkSubscription = useCallback(async () => {
    if (!isPushSupported()) {
      setPermission('unsupported');
      setIsLoading(false);
      return;
    }

    try {
      // Check browser permission
      const currentPermission = Notification.permission;
      setPermission(currentPermission as PushPermissionState);

      if (currentPermission !== 'granted' || !user) {
        setIsSubscribed(false);
        setIsLoading(false);
        return;
      }

      // Check if we have an active subscription in the database
      const { data: subscriptions, error } = await supabase
        .from('push_subscriptions')
        .select('id, endpoint')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) {
        throw error;
      }

      // Also check service worker subscription
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();

      if (existingSubscription && subscriptions && subscriptions.length > 0) {
        // Verify the endpoint matches
        const matchingSubscription = subscriptions.find(
          (sub: { endpoint: string }) => sub.endpoint === existingSubscription.endpoint
        );
        setIsSubscribed(!!matchingSubscription);
      } else {
        setIsSubscribed(false);
      }
    } catch (error) {
      logger.error('Failed to check push subscription', error as Error, {
        component: 'usePushNotifications',
        operation: 'checkSubscription',
      });
      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  }, [isPushSupported, user]);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!user) {
      toast.error('Please log in to enable push notifications');
      return false;
    }

    if (!isPushSupported()) {
      toast.error('Push notifications are not supported in this browser');
      return false;
    }

    setIsLoading(true);

    try {
      // Request permission if needed
      let currentPermission = Notification.permission;
      
      if (currentPermission === 'default') {
        currentPermission = await Notification.requestPermission();
        setPermission(currentPermission as PushPermissionState);
      }

      if (currentPermission !== 'granted') {
        toast.error('Notification permission denied');
        setIsLoading(false);
        return false;
      }

      // Get VAPID public key
      const vapidPublicKey = await getVapidPublicKey();
      if (!vapidPublicKey) {
        toast.error('Failed to get push notification configuration');
        setIsLoading(false);
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Check for existing subscription
      let subscription = await registration.pushManager.getSubscription();

      // If no subscription, create one
      if (!subscription) {
        const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
        });
      }

      // Extract keys from subscription
      const subscriptionJson = subscription.toJSON();
      const p256dhKey = subscriptionJson.keys?.p256dh || '';
      const authKey = subscriptionJson.keys?.auth || '';

      // Determine platform
      const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                    (window.navigator as { standalone?: boolean }).standalone === true;
      const platform = isPWA ? 'pwa' : 'web';

      // Store subscription in database
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh_key: p256dhKey,
          auth_key: authKey,
          platform,
          user_agent: navigator.userAgent,
          is_active: true,
          last_used_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,endpoint',
        });

      if (error) {
        throw error;
      }

      // Update notification preferences
      await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: user.id,
          push_on_completion: true,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      setIsSubscribed(true);
      toast.success('Push notifications enabled!');
      
      logger.info('Push subscription created', {
        component: 'usePushNotifications',
        userId: user.id,
        platform,
        operation: 'subscribe',
      });

      return true;
    } catch (error) {
      logger.error('Failed to subscribe to push notifications', error as Error, {
        component: 'usePushNotifications',
        userId: user?.id,
        operation: 'subscribe',
      });
      toast.error('Failed to enable push notifications');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, isPushSupported, getVapidPublicKey, urlBase64ToUint8Array]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!user) {
      return false;
    }

    setIsLoading(true);

    try {
      // Get service worker subscription
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from push manager
        await subscription.unsubscribe();
      }

      // Mark all subscriptions as inactive in database
      const { error } = await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      // Update notification preferences
      await supabase
        .from('user_notification_preferences')
        .update({
          push_on_completion: false,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      setIsSubscribed(false);
      toast.success('Push notifications disabled');

      logger.info('Push subscription removed', {
        component: 'usePushNotifications',
        userId: user.id,
        operation: 'unsubscribe',
      });

      return true;
    } catch (error) {
      logger.error('Failed to unsubscribe from push notifications', error as Error, {
        component: 'usePushNotifications',
        userId: user?.id,
        operation: 'unsubscribe',
      });
      toast.error('Failed to disable push notifications');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Check subscription status on mount and when user changes
  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  return {
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    checkSubscription,
  };
}
