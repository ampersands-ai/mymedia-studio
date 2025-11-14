/**
 * Error Notifications Hook
 *
 * ⚠️ TEMPORARILY DISABLED
 * This feature requires Supabase types regeneration.
 * See SUPABASE_TYPES_FIX.md for instructions.
 */

export interface ErrorNotification {
  id: string;
  user_id: string;
  error_event_id: string;
  title: string;
  message: string;
  action_label: string | null;
  action_url: string | null;
  shown: boolean;
  shown_at: string | null;
  dismissed: boolean;
  dismissed_at: string | null;
  created_at: string;
  expires_at: string;
}

export function useErrorNotifications() {
  return {
    notifications: [] as ErrorNotification[],
    isLoading: false,
    markAsShown: {
      mutate: () => {},
      mutateAsync: async () => {},
      isPending: false,
    } as any,
    dismissNotification: {
      mutate: () => {},
      mutateAsync: async () => {},
      isPending: false,
    } as any,
  };
}
