import { useEffect, useState } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Sparkles, Settings, Menu, X, Coins } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useUserTokens } from "@/hooks/useUserTokens";
import { Footer } from "@/components/Footer";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";
import textLogo from "@/assets/text-logo.png";

export const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, session, loading } = useAuth();
  const { data: tokenData } = useUserTokens();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !session) {
      navigate("/auth");
    }
  }, [session, loading, navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const isActive = (path: string) => location.pathname === path;

  // Instant render - no loading state
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b-4 border-black bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 md:gap-3 hover:opacity-80 transition-opacity">
              <img 
                src={logo} 
                alt="Artifio.ai logo" 
                className="h-8 w-8 md:h-10 md:w-10 rounded-xl border-3 border-black brutal-shadow"
              />
              <img 
                src={textLogo} 
                alt="Artifio" 
                className="h-6 md:h-8"
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-2">
              <Link to="/dashboard/create">
                <Button
                  variant={isActive("/dashboard/create") ? "default" : "ghost"}
                  className={cn(
                    "text-base px-6 py-5",
                    isActive("/dashboard/create") && "bg-neon-blue hover:bg-neon-blue/90 text-black font-bold"
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
                    "text-base px-6 py-5",
                    isActive("/dashboard/custom-creation") && "bg-neon-green hover:bg-neon-green/90 text-black font-bold border-3 border-black"
                  )}
                >
                  <Sparkles className="h-5 w-5 mr-2" />
                  Custom Creation
                </Button>
              </Link>
              <Link to="/dashboard/settings">
                <Button
                  variant={isActive("/dashboard/settings") ? "default" : "ghost"}
                  className={cn(
                    "text-base px-6 py-5",
                    isActive("/dashboard/settings") && "bg-foreground text-background"
                  )}
                >
                  <Settings className="h-5 w-5 mr-2" />
                  Settings
                </Button>
              </Link>
            </nav>

            <div className="flex items-center gap-2 md:gap-3">
              <div className="brutal-card-sm px-3 md:px-4 py-2 bg-neon-yellow">
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 md:h-5 md:w-5" />
                  <span className="font-black text-sm md:text-base">{tokenData?.tokens_remaining || 0}</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleSignOut}
                className="hidden md:flex"
              >
                <LogOut className="h-5 w-5" />
              </Button>

              {/* Mobile Menu */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="md:hidden">
                    {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <nav className="flex flex-col gap-4 mt-8">
                    <Link 
                      to="/dashboard/custom-creation" 
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors",
                        isActive("/dashboard/custom-creation") 
                          ? "bg-neon-green text-black" 
                          : "hover:bg-accent"
                      )}
                    >
                      <Sparkles className="h-5 w-5" />
                      <span>Custom Creation</span>
                    </Link>
                    <Link 
                      to="/dashboard/create" 
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors",
                        isActive("/dashboard/create") 
                          ? "bg-neon-blue text-black" 
                          : "hover:bg-accent"
                      )}
                    >
                      <Sparkles className="h-5 w-5" />
                      <span>Templates</span>
                    </Link>
                    <Link 
                      to="/dashboard/settings" 
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent transition-colors font-medium"
                    >
                      <Settings className="h-5 w-5" />
                      <span>Settings</span>
                    </Link>
                    <Button
                      variant="outline"
                      onClick={handleSignOut}
                      className="justify-start"
                    >
                      <LogOut className="h-5 w-5 mr-3" />
                      Sign Out
                    </Button>
                  </nav>
                </SheetContent>
              </Sheet>
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
