import { useEffect } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Sparkles, Coins, History } from "lucide-react";
import { useUserTokens } from "@/hooks/useUserTokens";
import { Footer } from "@/components/Footer";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";
import { MobileMenu } from "@/components/MobileMenu";

export const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, loading } = useAuth();
  const { data: tokenData } = useUserTokens();

  useEffect(() => {
    if (!loading && !session) {
      navigate("/auth");
    }
  }, [session, loading, navigate]);

  const isActive = (path: string) => location.pathname === path;

  // Instant render - no loading state
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b-4 border-black bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between gap-2">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0">
            <img 
              src={logo} 
              alt="artifio.ai  logo" 
              className="h-6 md:h-8 object-contain"
              />
              <span className="font-black text-lg md:text-xl text-foreground">artifio.ai</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-2">
              <Link to="/dashboard/templates">
                <Button
                  variant={isActive("/dashboard/templates") ? "default" : "ghost"}
                  className={cn(
                    "text-base px-6 py-5 rounded-full",
                    isActive("/dashboard/templates") 
                      ? "bg-primary-500 text-neutral-900 font-semibold border-2 border-primary-600 hover:bg-primary-600" 
                      : "text-secondary-600 hover:bg-secondary-50 hover:text-secondary-700 font-medium"
                  )}
                >
                  <Sparkles className="h-5 w-5 mr-2" />
                  Templates
                </Button>
              </Link>
              <Link to="/dashboard/custom-creation">
                <Button
                  variant={isActive("/dashboard/custom-creation") ? "default" : "ghost"}
                  className={cn(
                    "text-base px-6 py-5 rounded-full",
                    isActive("/dashboard/custom-creation") 
                      ? "bg-primary-500 text-neutral-900 font-semibold border-2 border-primary-600 hover:bg-primary-600" 
                      : "text-secondary-600 hover:bg-secondary-50 hover:text-secondary-700 font-medium"
                  )}
                >
                  <Sparkles className="h-5 w-5 mr-2" />
                  Custom Creation
                </Button>
              </Link>
              <Link to="/dashboard/history">
                <Button
                  variant={isActive("/dashboard/history") ? "default" : "ghost"}
                  className={cn(
                    "text-base px-6 py-5 rounded-full",
                    isActive("/dashboard/history") 
                      ? "bg-primary-500 text-neutral-900 font-semibold border-2 border-primary-600 hover:bg-primary-600" 
                      : "text-secondary-600 hover:bg-secondary-50 hover:text-secondary-700 font-medium"
                  )}
                >
                  <History className="h-5 w-5 mr-2" />
                  My Creations
                </Button>
              </Link>
            </nav>

            <div className="flex items-center gap-1.5 md:gap-3 flex-shrink-0">
              <div className="brutal-card-sm px-2 md:px-4 py-1.5 md:py-2 bg-primary-500 text-neutral-900 border-2 border-primary-600">
                <div className="flex items-center gap-1 md:gap-2">
                  <Coins className="h-3.5 w-3.5 md:h-5 md:w-5" />
                  <span className="font-black text-xs md:text-base whitespace-nowrap">{(tokenData?.tokens_remaining || 0).toLocaleString()}</span>
                </div>
              </div>

              {/* Mobile Menu */}
              <MobileMenu tokenBalance={tokenData?.tokens_remaining} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
};
