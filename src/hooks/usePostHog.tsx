import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserTokens } from './useUserTokens';
import { trackPageView, identifyUser, setUserProperties } from '@/lib/posthog';
import { useGenerationTracking } from './useGenerationTracking';

export const usePostHog = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { data: tokenData } = useUserTokens();

  // Track page views
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);

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
};
