import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Coins, Shield, Clock, Layout } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useUserTokens } from "@/hooks/useUserTokens";
import { toast } from "sonner";
import { MobileMenu } from "@/components/MobileMenu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { OptimizedImage } from "@/components/ui/optimized-image";
import logoImage from "@/assets/logo.png";

export const GlobalHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { isAdmin } = useAdminRole();
  const { data: tokenData } = useUserTokens();
  const tokenBalance = tokenData?.tokens_remaining ?? null;
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/");
      toast.success("Signed out successfully");
    } catch (error) {
      toast.error("Error signing out");
      console.error("Sign out error:", error);
    }
  };

  const getTokenConversions = (balance: number) => {
    return {
      videos: Math.floor(balance / 100),
      images: Math.floor(balance / 25),
      audio: Math.floor(balance / 50),
    };
  };

  const isCustomCreation = location.pathname === "/dashboard/custom-creation";
  const isSettingsPage = location.pathname === "/dashboard/settings";

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
      isScrolled 
        ? "backdrop-blur-xl bg-card/80 shadow-lg border-b border-border/30" 
        : "bg-transparent"
    )}>
      <nav className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">

          {/* Left Side - Logo */}
          <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <OptimizedImage 
              src={logoImage} 
              alt="artifio.ai logo" 
              width={32}
              height={32}
              className="h-6 md:h-8 object-contain"
              priority={true}
              isSupabaseImage={false}
            />
            <span className="text-xl font-bold text-foreground">
              artifio.ai
            </span>
          </Link>

          {/* Center - Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <button 
              onClick={() => navigate("/features")}
              className="text-foreground/80 hover:text-primary-orange transition-colors font-medium"
            >
              Features
            </button>
            <button 
              onClick={() => navigate("/dashboard/templates")}
              className="text-foreground/80 hover:text-primary-orange transition-colors font-medium"
            >
              Templates
            </button>
            <button 
              onClick={() => navigate("/dashboard/custom-creation")}
              className="text-foreground/80 hover:text-primary-orange transition-colors font-medium"
            >
              Custom Creation
            </button>
            <button 
              onClick={() => navigate("/dashboard/storyboard")}
              className="text-foreground/80 hover:text-primary-orange transition-colors font-medium flex items-center gap-1"
            >
              🎬 Storyboard
            </button>
            <button 
              onClick={() => navigate("/pricing")}
              className="text-foreground/80 hover:text-primary-orange transition-colors font-medium"
            >
              Pricing
            </button>
            <button 
              onClick={() => navigate("/blog")}
              className="text-foreground/80 hover:text-primary-orange transition-colors font-medium"
            >
              Blog
            </button>
          </nav>

          {/* Right Side - Actions */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />

            {user && (
              <button
                onClick={() => navigate("/dashboard/templates")}
                className="px-4 py-2 rounded-full backdrop-blur-lg bg-gradient-to-r from-primary-yellow to-primary-orange text-white border border-border/30 flex items-center gap-2 hover:opacity-90 transition-all duration-300 hover:scale-105 shadow-md font-semibold"
              >
                <Layout className="h-5 w-5" />
                Dashboard
              </button>
            )}

            {tokenBalance !== null && (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="px-4 py-2 rounded-full backdrop-blur-lg bg-card/80 border border-border/30 flex items-center gap-2 hover:bg-card/95 transition-all duration-300 hover:scale-105 shadow-md">
                    <Coins className="h-5 w-5 text-primary-orange" />
                    <span className="font-bold text-base">
                      {tokenBalance.toLocaleString()}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent 
                  className="w-80 bg-popover border-2 border-secondary-600 dark:border-secondary-500 shadow-lg p-4 animate-in fade-in-0 zoom-in-95 duration-200"
                  align="end"
                  sideOffset={8}
                >
                  <div className="space-y-4">
                    {/* Credit Balance Header */}
                    <div className="border-b-2 border-neutral-200 pb-3">
                      <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                        Credit Balance
                      </p>
                      <p className="text-3xl font-black text-foreground mt-1">
                        {tokenBalance.toLocaleString()}
                      </p>
                    </div>

                    {/* Conversion Estimates */}
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                        Approximate Creations
                      </p>
                      <div className="space-y-2">
                        {(() => {
                          const conversions = getTokenConversions(tokenBalance);
                          return (
                            <>
                              <div className="flex items-center justify-between py-2 px-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
                                <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                                  Videos
                                </span>
                                <span className="text-base font-black text-secondary-700">
                                  ~{conversions.videos}
                                </span>
                              </div>
                              <div className="flex items-center justify-between py-2 px-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
                                <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                                  Images
                                </span>
                                <span className="text-base font-black text-secondary-700">
                                  ~{conversions.images}
                                </span>
                              </div>
                              <div className="flex items-center justify-between py-2 px-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
                                <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                                  Audio
                                </span>
                                <span className="text-base font-black text-secondary-700">
                                  ~{conversions.audio}
                                </span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Usage History Link */}
                    <div className="pt-2 border-t-2 border-neutral-200">
                      <Link 
                        to="/dashboard/settings" 
                        state={{ defaultTab: 'history' }}
                        className="flex items-center justify-center gap-2 py-2 px-4 bg-secondary-600 hover:bg-secondary-700 text-white font-bold text-sm rounded-lg transition-colors duration-200"
                      >
                        <Clock className="h-4 w-4" />
                        View Usage History
                      </Link>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {isAdmin && (
              <button
                onClick={() => navigate("/admin/dashboard")}
                className="px-4 py-2 rounded-full backdrop-blur-lg bg-card/80 border border-border/30 flex items-center gap-2 hover:bg-card/95 transition-all duration-300 hover:scale-105 shadow-md font-semibold"
              >
                <Shield className="h-5 w-5" />
                Admin
              </button>
            )}
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden">
            <MobileMenu tokenBalance={tokenBalance ?? undefined} />
          </div>
        </div>
      </nav>
    </header>
  );
};
