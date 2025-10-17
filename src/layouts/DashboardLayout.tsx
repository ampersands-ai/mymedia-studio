import { useEffect, useState } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Sparkles, Settings, Menu, X, Coins, History } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUserTokens } from "@/hooks/useUserTokens";
import { Footer } from "@/components/Footer";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

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
              <Link to="/dashboard/create">
                <Button
                  variant={isActive("/dashboard/create") ? "default" : "ghost"}
                  className={cn(
                    "text-base px-6 py-5 rounded-full",
                    isActive("/dashboard/create") 
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
              <Link to="/dashboard/settings">
                <Button
                  variant={isActive("/dashboard/settings") ? "default" : "ghost"}
                  className={cn(
                    "text-base px-6 py-5 rounded-full",
                    isActive("/dashboard/settings") 
                      ? "bg-primary-500 text-neutral-900 font-semibold border-2 border-primary-600 hover:bg-primary-600" 
                      : "text-secondary-600 hover:bg-secondary-50 hover:text-secondary-700 font-medium"
                  )}
                >
                  <Settings className="h-5 w-5 mr-2" />
                  Settings
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
                <SheetContent className="flex flex-col p-0 pb-safe">
                  <div className="p-6 border-b">
                    <h2 className="text-lg font-semibold">Navigation</h2>
                  </div>
                  
                  <ScrollArea className="flex-1 px-6">
                    <nav className="flex flex-col gap-4 py-6">
                      {/* Dashboard Section */}
                      <div className="text-xs font-bold text-muted-foreground mb-2 px-2">DASHBOARD</div>
                      <Link 
                        to="/dashboard/custom-creation" 
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                          isActive("/dashboard/custom-creation") 
                            ? "bg-primary-500 text-neutral-900 font-semibold border-2 border-primary-600" 
                            : "text-secondary-600 hover:bg-secondary-50 hover:text-secondary-700 font-medium"
                        )}
                      >
                        <Sparkles className="h-5 w-5" />
                        <span>Custom Creation</span>
                      </Link>
                      <Link 
                        to="/dashboard/create" 
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                          isActive("/dashboard/create") 
                            ? "bg-primary-500 text-neutral-900 font-semibold border-2 border-primary-600" 
                            : "text-secondary-600 hover:bg-secondary-50 hover:text-secondary-700 font-medium"
                        )}
                      >
                        <Sparkles className="h-5 w-5" />
                        <span>Templates</span>
                      </Link>
                      <Link 
                        to="/dashboard/history" 
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                          isActive("/dashboard/history") 
                            ? "bg-primary-500 text-neutral-900 font-semibold border-2 border-primary-600" 
                            : "text-secondary-600 hover:bg-secondary-50 hover:text-secondary-700 font-medium"
                        )}
                      >
                        <History className="h-5 w-5" />
                        <span>My Creations</span>
                      </Link>

                      {/* Product Section */}
                      <div className="text-xs font-bold text-muted-foreground mt-4 mb-2 px-2">PRODUCT</div>
                      <Link 
                        to="/features" 
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                          isActive("/features") 
                            ? "bg-primary-500 text-neutral-900 font-semibold border-2 border-primary-600" 
                            : "text-secondary-600 hover:bg-secondary-50 hover:text-secondary-700 font-medium"
                        )}
                      >
                        <span>Features</span>
                      </Link>
                      <Link 
                        to="/templates" 
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                          isActive("/templates") 
                            ? "bg-primary-500 text-neutral-900 font-semibold border-2 border-primary-600" 
                            : "text-secondary-600 hover:bg-secondary-50 hover:text-secondary-700 font-medium"
                        )}
                      >
                        <span>Templates</span>
                      </Link>
                      <Link 
                        to="/pricing" 
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                          isActive("/pricing") 
                            ? "bg-primary-500 text-neutral-900 font-semibold border-2 border-primary-600" 
                            : "text-secondary-600 hover:bg-secondary-50 hover:text-secondary-700 font-medium"
                        )}
                      >
                        <span>Pricing</span>
                      </Link>

                      {/* Resources Section */}
                      <div className="text-xs font-bold text-muted-foreground mt-4 mb-2 px-2">RESOURCES</div>
                      <Link 
                        to="/about" 
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                          isActive("/about") 
                            ? "bg-primary-500 text-neutral-900 font-semibold border-2 border-primary-600" 
                            : "text-secondary-600 hover:bg-secondary-50 hover:text-secondary-700 font-medium"
                        )}
                      >
                        <span>About</span>
                      </Link>
                      <Link 
                        to="/blog" 
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                          isActive("/blog") 
                            ? "bg-primary-500 text-neutral-900 font-semibold border-2 border-primary-600" 
                            : "text-secondary-600 hover:bg-secondary-50 hover:text-secondary-700 font-medium"
                        )}
                      >
                        <span>Blog</span>
                      </Link>
                      <Link 
                        to="/faq" 
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                          isActive("/faq") 
                            ? "bg-primary-500 text-neutral-900 font-semibold border-2 border-primary-600" 
                            : "text-secondary-600 hover:bg-secondary-50 hover:text-secondary-700 font-medium"
                        )}
                      >
                        <span>FAQ</span>
                      </Link>
                      <Link 
                        to="/community" 
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                          isActive("/community") 
                            ? "bg-primary-500 text-neutral-900 font-semibold border-2 border-primary-600" 
                            : "text-secondary-600 hover:bg-secondary-50 hover:text-secondary-700 font-medium"
                        )}
                      >
                        <span>Community</span>
                      </Link>

                      {/* Account Section */}
                      <div className="text-xs font-bold text-muted-foreground mt-4 mb-2 px-2">ACCOUNT</div>
                      <Link 
                        to="/dashboard/settings" 
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                          isActive("/dashboard/settings") 
                            ? "bg-primary-500 text-neutral-900 font-semibold border-2 border-primary-600" 
                            : "text-secondary-600 hover:bg-secondary-50 hover:text-secondary-700 font-medium"
                        )}
                      >
                        <Settings className="h-5 w-5" />
                        <span>Settings</span>
                      </Link>
                    </nav>
                  </ScrollArea>
                  
                  <div className="p-6 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={handleSignOut}
                      className="justify-start w-full"
                    >
                      <LogOut className="h-5 w-5 mr-3" />
                      Sign Out
                    </Button>
                  </div>
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
