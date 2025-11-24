import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent, identifyUser, resetPostHog } from "@/lib/posthog";
import { logger } from "@/lib/logger";

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        authLogger.debug('Auth event received', { event, hasSession: !!session } as any);
        
        // Handle token expired or refresh failed
        if (event === 'TOKEN_REFRESHED' && !session) {
          authLogger.warn('Token refresh failed, signing out');
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }
        
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          resetPostHog();
        } else {
          setSession(session);
          setUser(session?.user ?? null);
          
          // Track signup event
          if (event === 'SIGNED_IN' && session?.user) {
            const isNewUser = new Date(session.user.created_at).getTime() > Date.now() - 5000;
            if (isNewUser) {
              trackEvent('signup', {
                user_id: session.user.id,
                email: session.user.email,
              });
            }
            identifyUser(session.user.id, {
              email: session.user.email,
              signup_date: session.user.created_at,
            });
          }
        }
        
        // Avoid turning off loading on INITIAL_SESSION if we're about to exchange the code
        if (event !== "INITIAL_SESSION" || !hasCode) {
          setLoading(false);
        }
      }
    );

    if (hasCode && !hasError) {
      // Perform the OAuth code exchange once, then auth listener will update state
      (async () => {
        try {
          await supabase.auth.exchangeCodeForSession(window.location.href);
        } catch (e) {
          authLogger.error("OAuth exchange failed", e as Error);
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

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
