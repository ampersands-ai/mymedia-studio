import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { preloadForAuthenticatedUser, preloadForAnonymousUser } from '@/utils/routePreload';

/**
 * Automatically preload critical routes based on user authentication status
 * Call this in App.tsx or main layout
 */
export function useRoutePreload() {
  const { user } = useAuth();

  useEffect(() => {
    // Wait a bit for initial page load
    const timeout = setTimeout(() => {
      if (user) {
        preloadForAuthenticatedUser();
      } else {
        preloadForAnonymousUser();
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, [user]);
}
