import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent, identifyUser, resetPostHog, getBrandDeviceId } from "@/lib/posthog";
import { logger } from "@/lib/logger";
import { getStoredUtmParams, clearStoredUtmParams } from "@/hooks/useUtmCapture";
import { toast } from "sonner";

const authLogger = logger.child({ component: 'AuthContext' });

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Parse URL params UP FRONT
    const url = new URL(window.location.href);
    const hasCode = url.searchParams.get("code");
    const hasError = url.searchParams.get("error_description") || url.searchParams.get("error");

    // Set up auth state listener FIRST
    // Safety timeout to prevent infinite loading
    const loadingTimeoutId = setTimeout(() => {
      authLogger.warn('Auth loading timeout reached, forcing complete');
      setLoading(false);
    }, 8000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        authLogger.debug('Auth event received', { event, hasSession: !!session } as any);
        
        // Handle token expired or refresh failed
        if (event === 'TOKEN_REFRESHED' && !session) {
          authLogger.warn('Token refresh failed, signing out');
          setSession(null);
          setUser(null);
          setLoading(false);
          // Defer signOut to prevent deadlock
          setTimeout(() => {
            supabase.auth.signOut();
            toast.error("Your session expired. Please log in again.");
          }, 0);
          return;
        }
        
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          resetPostHog();
        } else {
          setSession(session);
          setUser(session?.user ?? null);
          
          // Track signup event and save attribution for new users
          if (event === 'SIGNED_IN' && session?.user) {
            const isNewUser = new Date(session.user.created_at).getTime() > Date.now() - 5000;
            if (isNewUser) {
              trackEvent('signup', {
                user_id: session.user.id,
                email: session.user.email,
              });
              
              // Save UTM attribution for OAuth signups
              const utmParams = getStoredUtmParams();
              if (utmParams) {
                const provider = session.user.app_metadata?.provider || 'oauth';
                supabase.functions.invoke('save-signup-attribution', {
                  body: {
                    ...utmParams,
                    signup_method: provider,
                  }
                }).then(() => {
                  clearStoredUtmParams();
                }).catch((err) => {
                  authLogger.error('Failed to save OAuth attribution', err as Error);
                });
              }
              
              // Send welcome email for OAuth signups (non-blocking)
              supabase.functions.invoke('send-welcome-email', {
                body: {
                  userId: session.user.id,
                  email: session.user.email,
                  fullName: session.user.user_metadata?.full_name || session.user.user_metadata?.name
                }
              }).catch((err) => {
                authLogger.error('Failed to send welcome email for OAuth signup', err as Error);
              });
              
              // Note: Admin notification is handled by database trigger (handle_new_user)
              // to avoid duplicate emails
            }
            
            // Migrate anonymous consent records to this user (non-blocking to prevent auth flow stalling)
            const deviceId = getBrandDeviceId();
            supabase.functions.invoke('manage-consent', {
              body: {
                action: 'migrate',
                device_id: deviceId,
              },
            }).then(({ data: migrationResult }) => {
              if (migrationResult?.migrated_count > 0) {
                authLogger.debug('Migrated anonymous consent records', { count: migrationResult.migrated_count } as any);
              }
            }).catch((err) => {
              authLogger.error('Failed to migrate consent records', err as Error);
            });
            
            identifyUser(session.user.id, {
              email: session.user.email,
              signup_date: session.user.created_at,
            });
          }
        }
        
        setLoading(false);
      }
    );

    if (hasCode && !hasError) {
      // Perform the OAuth code exchange once, then auth listener will update state
      (async () => {
      try {
          await supabase.auth.exchangeCodeForSession(window.location.href);
        } catch (e) {
          authLogger.error("OAuth exchange failed", e as Error);
          // Notify user about auth failure - deferred to prevent React state issues
          setTimeout(() => {
            toast.error("Authentication failed. Please try again.");
          }, 0);
        } finally {
          // Clean the URL so we don't keep re-exchanging the code on refresh
          const cleanUrl = `${url.origin}${url.pathname}${url.hash}`;
          window.history.replaceState({}, document.title, cleanUrl);
          setLoading(false);
        }
      })();
    } else {
      // THEN check for existing session
      (async () => {
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (error) {
            authLogger.error('Failed to get session', error as Error);
          }
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        } catch (err) {
          authLogger.error('Error getting session', err as Error);
          setLoading(false);
        }
      })();
    }

    return () => {
      subscription.unsubscribe();
      clearTimeout(loadingTimeoutId);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
