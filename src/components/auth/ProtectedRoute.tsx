import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo.png";

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
 */
export const ProtectedRoute = ({ 
  children, 
  redirectTo = "/auth" 
}: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate(redirectTo, { replace: true });
    }
  }, [user, loading, navigate, redirectTo]);

  // Show branded loading screen while checking auth
  if (loading) {
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
