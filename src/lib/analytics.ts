import { trackEvent } from './posthog';

/**
 * Enhanced analytics tracking for user journey and conversions
 */

// User Journey Events
export const analytics = {
  // Page interactions
  pageView: (pageName: string, metadata?: Record<string, any>) => {
    trackEvent('page_view', {
      page_name: pageName,
      timestamp: Date.now(),
      ...metadata,
    });
  },

  // User actions
  buttonClick: (buttonName: string, location: string) => {
    trackEvent('button_click', {
      button_name: buttonName,
      location,
      timestamp: Date.now(),
    });
  },

  linkClick: (linkText: string, destination: string) => {
    trackEvent('link_click', {
      link_text: linkText,
      destination,
      timestamp: Date.now(),
    });
  },

  // Forms
  formStart: (formName: string) => {
    trackEvent('form_started', {
      form_name: formName,
      timestamp: Date.now(),
    });
  },

  formComplete: (formName: string, duration: number) => {
    trackEvent('form_completed', {
      form_name: formName,
      duration_ms: duration,
      timestamp: Date.now(),
    });
  },

  formAbandon: (formName: string, lastField: string) => {
    trackEvent('form_abandoned', {
      form_name: formName,
      last_field: lastField,
      timestamp: Date.now(),
    });
  },

  // Conversions
  signupStart: (method?: string) => {
    trackEvent('signup_started', {
      method: method || 'email',
      timestamp: Date.now(),
    });
  },

  signupComplete: (userId: string, method?: string) => {
    trackEvent('signup_completed', {
      user_id: userId,
      method: method || 'email',
      timestamp: Date.now(),
    });
  },

  purchaseStart: (plan: string, price: number) => {
    trackEvent('purchase_started', {
      plan,
      price,
      timestamp: Date.now(),
    });
  },

  purchaseComplete: (plan: string, price: number, transactionId: string) => {
    trackEvent('purchase_completed', {
      plan,
      price,
      transaction_id: transactionId,
      timestamp: Date.now(),
    });
  },

  // Feature usage
  featureUsed: (featureName: string, metadata?: Record<string, any>) => {
    trackEvent('feature_used', {
      feature_name: featureName,
      timestamp: Date.now(),
      ...metadata,
    });
  },

  // Engagement
  timeOnPage: (pageName: string, seconds: number) => {
    trackEvent('time_on_page', {
      page_name: pageName,
      duration_seconds: seconds,
      timestamp: Date.now(),
    });
  },

  scrollDepth: (pageName: string, percentage: number) => {
    trackEvent('scroll_depth', {
      page_name: pageName,
      percentage,
      timestamp: Date.now(),
    });
  },

  // Errors
  error: (errorType: string, errorMessage: string, context?: Record<string, any>) => {
    trackEvent('error_occurred', {
      error_type: errorType,
      error_message: errorMessage,
      timestamp: Date.now(),
      ...context,
    });
  },

  // Search
  search: (query: string, resultsCount: number) => {
    trackEvent('search_performed', {
      query,
      results_count: resultsCount,
      timestamp: Date.now(),
    });
  },

  // Social
  share: (contentType: string, platform: string) => {
    trackEvent('content_shared', {
      content_type: contentType,
      platform,
      timestamp: Date.now(),
    });
  },
};

/**
 * User journey funnel tracking
 */
export class FunnelTracker {
  private funnelName: string;
  private steps: string[] = [];
  private startTime: number = Date.now();

  constructor(funnelName: string) {
    this.funnelName = funnelName;
    trackEvent('funnel_started', {
      funnel_name: funnelName,
      timestamp: this.startTime,
    });
  }

  step(stepName: string, metadata?: Record<string, any>) {
    this.steps.push(stepName);
    trackEvent('funnel_step', {
      funnel_name: this.funnelName,
      step_name: stepName,
      step_number: this.steps.length,
      timestamp: Date.now(),
      ...metadata,
    });
  }

  complete(metadata?: Record<string, any>) {
    const duration = Date.now() - this.startTime;
    trackEvent('funnel_completed', {
      funnel_name: this.funnelName,
      total_steps: this.steps.length,
      duration_ms: duration,
      timestamp: Date.now(),
      ...metadata,
    });
  }

  abandon(reason?: string) {
    const duration = Date.now() - this.startTime;
    trackEvent('funnel_abandoned', {
      funnel_name: this.funnelName,
      last_step: this.steps[this.steps.length - 1],
      completed_steps: this.steps.length,
      duration_ms: duration,
      reason,
      timestamp: Date.now(),
    });
  }
}

/**
 * Session tracking
 */
export function trackSession() {
  const sessionStart = Date.now();
  let scrollDepth = 0;
  let interactions = 0;

  // Track scroll depth
  const handleScroll = () => {
    const scrollPercentage = Math.round(
      (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
    );
    
    if (scrollPercentage > scrollDepth) {
      scrollDepth = scrollPercentage;
    }
  };

  // Track interactions
  const handleInteraction = () => {
    interactions++;
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('click', handleInteraction, { passive: true });
  window.addEventListener('keydown', handleInteraction, { passive: true });

  // Send session data on unload
  const sendSessionData = () => {
    const sessionDuration = Date.now() - sessionStart;
    
    trackEvent('session_ended', {
      duration_ms: sessionDuration,
      max_scroll_depth: scrollDepth,
      total_interactions: interactions,
      timestamp: Date.now(),
    });
  };

  window.addEventListener('beforeunload', sendSessionData);

  return () => {
    window.removeEventListener('scroll', handleScroll);
    window.removeEventListener('click', handleInteraction);
    window.removeEventListener('keydown', handleInteraction);
    window.removeEventListener('beforeunload', sendSessionData);
  };
}
