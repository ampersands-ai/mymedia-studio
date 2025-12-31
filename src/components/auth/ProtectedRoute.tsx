import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";
import logo from "@/assets/logo.png";

const protectedRouteLogger = logger.child({ component: 'ProtectedRoute' });

// Maximum time to wait for auth before forcing render (prevents infinite loading)
const AUTH_LOADING_TIMEOUT_MS = 10000;

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * ProtectedRoute component that handles authentication checks
 * and redirects unauthenticated users to login page.
 * 
 * This centralizes auth protection logic to prevent:
 * - Flash of protected content during auth loading
 * - Duplicate auth checking code across layouts
 * - Infinite loading states from failed edge functions
 */
export const ProtectedRoute = ({ 
  children, 
  redirectTo = "/auth" 
}: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [forceRender, setForceRender] = useState(false);

  // Timeout protection: if auth loading takes too long, force render
  useEffect(() => {
    if (!loading) {
      setForceRender(false);
      return;
    }
    
    const timeout = setTimeout(() => {
      protectedRouteLogger.warn('Auth loading timeout reached, forcing render');
      setForceRender(true);
    }, AUTH_LOADING_TIMEOUT_MS);
    
    return () => clearTimeout(timeout);
  }, [loading]);

  useEffect(() => {
    if (!loading && !user) {
      navigate(redirectTo, { replace: true });
    }
  }, [user, loading, navigate, redirectTo]);

  // Show branded loading screen while checking auth (with timeout protection)
  if (loading && !forceRender) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-3 animate-pulse">
          <img 
            src={logo} 
            alt="artifio.ai logo" 
            className="h-10 md:h-12 object-contain"
          />
          <span className="font-black text-2xl md:text-3xl text-foreground">
            artifio.ai
          </span>
        </div>
      </div>
    );
  }

  // Don't render children if not authenticated
  if (!user) {
    return null;
  }

  return <>{children}</>;
};
