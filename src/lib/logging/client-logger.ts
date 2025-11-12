import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export const clientLogger = {
  /**
   * Log errors to the backend
   */
  error: async (error: Error, context: {
    routeName: string;
    userAction?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    metadata?: any;
  }) => {
    try {
      await supabase.functions.invoke('log-error', {
        body: {
          error_type: 'js_error',
          route_name: context.routeName,
          route_path: window.location.pathname,
          error_message: error.message,
          error_stack: error.stack,
          user_action: context.userAction,
          severity: context.severity || 'medium',
          browser_info: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
          },
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
            mobile: window.innerWidth < 768,
          },
          metadata: context.metadata,
        }
      });
    } catch (logError) {
      logger.error('Failed to log error to backend', logError as Error, {
        utility: 'client-logger',
        routeName: context.routeName,
        operation: 'error'
      });
    }
  },

  /**
   * Log user activities
   */
  activity: async (activity: {
    activityType: string;
    activityName: string;
    routeName?: string;
    description?: string;
    metadata?: any;
    durationMs?: number;
  }) => {
    try {
      await supabase.functions.invoke('log-activity', {
        body: {
          activity_type: activity.activityType,
          activity_name: activity.activityName,
          route_name: activity.routeName,
          route_path: window.location.pathname,
          description: activity.description,
          metadata: activity.metadata,
          duration_ms: activity.durationMs,
        }
      });
    } catch (logError) {
      logger.error('Failed to log activity to backend', logError as Error, {
        utility: 'client-logger',
        activityType: activity.activityType,
        operation: 'activity'
      });
    }
  },
};
