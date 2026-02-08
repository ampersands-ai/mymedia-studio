import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useUserTokens } from './useUserTokens';
import { trackPageView, identifyUser, setUserProperties, posthog } from '@/lib/posthog';
import { useGenerationTracking } from './useGenerationTracking';

/**
 * Hook for PostHog analytics integration.
 * Handles page view tracking, user identification, and generation tracking.
 * Returns the posthog instance for direct event capture.
 */
export const usePostHog = () => {
  const pathname = usePathname();
  const { user } = useAuth();
  const { data: tokenData } = useUserTokens();

  // Track page views
  useEffect(() => {
    if (pathname) trackPageView(pathname);
  }, [pathname]);

  // Identify user and set properties when user data changes
  useEffect(() => {
    if (user && tokenData) {
      identifyUser(user.id, {
        email: user.email,
        plan_type: tokenData.plan,
        signup_date: user.created_at,
      });

      setUserProperties({
        plan_type: tokenData.plan,
        tokens_remaining: tokenData.tokens_remaining,
      });
    }
  }, [user, tokenData]);

  // Track generation completions
  useGenerationTracking();

  // Return posthog instance for direct event capture
  return posthog;
};
