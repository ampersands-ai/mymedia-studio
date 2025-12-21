import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Menu, Home, Wand2, Settings, LogOut, Shield,
  Sparkles, Layout, DollarSign, Info, BookOpen, HelpCircle, Users, History, Video, Clock
} from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";

export const MobileMenu = ({ creditBalance: _creditBalance }: { creditBalance?: number }) => {
  const { user } = useAuth();
  const { isAdmin } = useAdminRole();
  const { isFeatureEnabled, isFeatureComingSoon, isPageEnabled } = useFeatureFlags();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  
  const showFeaturesPage = isPageEnabled('features') || isAdmin;
  const showBlogPage = isPageEnabled('blog') || isAdmin;
  const showCommunityPage = isPageEnabled('community') || isAdmin;

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setOpen(false);
      navigate("/");
      toast.success("Signed out successfully");
    } catch (error) {
      logger.error('Sign out failed', error as Error, {
        component: 'MobileMenu',
        operation: 'handleSignOut'
      });
      toast.error("Error signing out");
    }
  };

  const handleNavigation = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const isActive = (path: string) => location.pathname === path;
  const isDashboard = location.pathname.startsWith("/dashboard");

  const renderFeatureButton = (
    path: string,
    label: string,
    icon: React.ReactNode,
    featureId: 'templates' | 'custom_creation' | 'faceless_videos' | 'storyboard'
  ) => {
    const enabled = isFeatureEnabled(featureId);
    const comingSoon = isFeatureComingSoon(featureId);

    // Admin bypass: always show features even if disabled/coming soon
    if (!enabled && !isAdmin) return null;

    // For non-admins, show disabled coming soon state
    if (comingSoon && !isAdmin) {
      return (
        <button
          key={path}
          disabled
          className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-left opacity-50 cursor-not-allowed text-muted-foreground"
        >
          <div className="flex items-center gap-3">
            {icon}
            <span>{label}</span>
          </div>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            Soon
          </span>
        </button>
      );
    }

    // Admin indicator for disabled/coming soon features
    const showAdminIndicator = isAdmin && (!enabled || comingSoon);

    return (
      <button
        key={path}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 text-left",
          isActive(path) 
            ? "bg-gradient-to-r from-primary-yellow to-primary-orange text-white font-semibold shadow-lg" 
            : "text-muted-foreground hover:bg-card/50 hover:text-foreground font-medium backdrop-blur-sm"
        )}
        onClick={() => handleNavigation(path)}
      >
        {icon}
        <span>{label}</span>
        {showAdminIndicator && (
          <Shield className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
        )}
      </button>
    );
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" title="Open menu" className="brutal-card-sm lg:hidden">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[280px] sm:w-[320px] flex flex-col p-0 pb-safe backdrop-blur-xl bg-card/95 border-l border-border/30">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/20 backdrop-blur-lg">
          <SheetTitle className="text-left font-bold text-xl">Navigation</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="flex flex-col gap-2 py-4">
            {/* Dashboard Context */}
            {isDashboard ? (
              <>
                <div className="text-xs font-bold text-foreground/60 mb-2 px-2">DASHBOARD</div>
                
                {renderFeatureButton(
                  "/dashboard/custom-creation",
                  "Custom Creation",
                  <Sparkles className="h-5 w-5" />,
                  "custom_creation"
                )}

                {renderFeatureButton(
                  "/dashboard/templates",
                  "Templates",
                  <Layout className="h-5 w-5" />,
                  "templates"
                )}

                <button
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left",
                    isActive("/dashboard/history") 
                      ? "bg-gradient-to-r from-primary-yellow to-primary-orange text-white font-semibold shadow-lg" 
                      : "text-foreground hover:bg-muted hover:text-foreground font-medium"
                  )}
                  onClick={() => handleNavigation("/dashboard/history")}
                >
                  <History className="h-5 w-5" />
                  <span>My Creations</span>
                </button>

                {renderFeatureButton(
                  "/dashboard/video-studio",
                  "Faceless Videos",
                  <Video className="h-5 w-5" />,
                  "faceless_videos"
                )}

                {renderFeatureButton(
                  "/dashboard/storyboard",
                  "Storyboard",
                  <span className="text-xl">🎬</span>,
                  "storyboard"
                )}

                <div className="text-xs font-bold text-foreground/60 mt-4 mb-2 px-2">RESOURCES</div>
                
                <button
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left",
                    isActive("/about") 
                      ? "bg-gradient-to-r from-primary-yellow to-primary-orange text-white font-semibold shadow-lg" 
                      : "text-foreground hover:bg-muted hover:text-foreground font-medium"
                  )}
                  onClick={() => handleNavigation("/about")}
                >
                  <Info className="h-5 w-5" />
                  <span>About</span>
                </button>

                {showBlogPage && (
                  <button
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left",
                      isActive("/blog") 
                        ? "bg-gradient-to-r from-primary-yellow to-primary-orange text-white font-semibold shadow-lg" 
                        : "text-foreground hover:bg-muted hover:text-foreground font-medium"
                    )}
                    onClick={() => handleNavigation("/blog")}
                  >
                    <BookOpen className="h-5 w-5" />
                    <span>Blog</span>
                  </button>
                )}

                <button
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left",
                    isActive("/faq") 
                      ? "bg-gradient-to-r from-primary-yellow to-primary-orange text-white font-semibold shadow-lg" 
                      : "text-foreground hover:bg-muted hover:text-foreground font-medium"
                  )}
                  onClick={() => handleNavigation("/faq")}
                >
                  <HelpCircle className="h-5 w-5" />
                  <span>FAQ</span>
                </button>

                {showCommunityPage && (
                  <button
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left",
                      isActive("/community") 
                        ? "bg-gradient-to-r from-primary-yellow to-primary-orange text-white font-semibold shadow-lg" 
                        : "text-foreground hover:bg-muted hover:text-foreground font-medium"
                    )}
                    onClick={() => handleNavigation("/community")}
                  >
                    <Users className="h-5 w-5" />
                    <span>Community</span>
                  </button>
                )}
              </>
            ) : (
              <>
                {/* Public Pages Context */}
                <button
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 text-left",
                    isActive("/") 
                      ? "bg-gradient-to-r from-primary-yellow to-primary-orange text-white font-semibold shadow-lg" 
                      : "text-foreground hover:bg-muted hover:text-foreground font-medium"
                  )}
                  onClick={() => handleNavigation("/")}
                >
                  <Home className="h-5 w-5" />
                  <span>Home</span>
                </button>

                <div className="text-xs font-bold text-foreground/60 mt-4 mb-2 px-2">PRODUCT</div>
                
                {showFeaturesPage && (
                  <button
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left",
                      isActive("/features") 
                        ? "bg-gradient-to-r from-primary-yellow to-primary-orange text-white font-semibold shadow-lg" 
                        : "text-foreground hover:bg-muted hover:text-foreground font-medium"
                    )}
                    onClick={() => handleNavigation("/features")}
                  >
                    <Sparkles className="h-5 w-5" />
                    <span>Features</span>
                  </button>
                )}

                {user && (
                  <button
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 text-left",
                      isDashboard
                        ? "bg-gradient-to-r from-primary-yellow to-primary-orange text-white font-semibold shadow-lg"
                        : "bg-gradient-to-r from-primary-yellow to-primary-orange text-white font-semibold shadow-lg hover:opacity-90"
                    )}
                    onClick={() => handleNavigation("/dashboard/templates")}
                  >
                    <Layout className="h-5 w-5" />
                    <span>Dashboard</span>
                  </button>
                )}

                {renderFeatureButton(
                  "/dashboard/templates",
                  "Templates",
                  <Layout className="h-5 w-5" />,
                  "templates"
                )}

                {renderFeatureButton(
                  "/dashboard/custom-creation",
                  "Custom Creation",
                  <Wand2 className="h-5 w-5" />,
                  "custom_creation"
                )}

                <button
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left",
                    isActive("/pricing") 
                      ? "bg-gradient-to-r from-primary-yellow to-primary-orange text-white font-semibold shadow-lg" 
                      : "text-foreground hover:bg-muted hover:text-foreground font-medium"
                  )}
                  onClick={() => handleNavigation("/pricing")}
                >
                  <DollarSign className="h-5 w-5" />
                  <span>Pricing</span>
                </button>

                {renderFeatureButton(
                  "/dashboard/storyboard",
                  "Storyboard",
                  <span className="text-xl">🎬</span>,
                  "storyboard"
                )}

                {renderFeatureButton(
                  "/dashboard/video-studio",
                  "Faceless Videos",
                  <Video className="h-5 w-5" />,
                  "faceless_videos"
                )}

                <div className="text-xs font-bold text-foreground/60 mt-4 mb-2 px-2">RESOURCES</div>
                
                <button
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left",
                    isActive("/about") 
                      ? "bg-gradient-to-r from-primary-yellow to-primary-orange text-white font-semibold shadow-lg" 
                      : "text-foreground hover:bg-muted hover:text-foreground font-medium"
                  )}
                  onClick={() => handleNavigation("/about")}
                >
                  <Info className="h-5 w-5" />
                  <span>About</span>
                </button>

                {showBlogPage && (
                  <button
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left",
                      isActive("/blog") 
                        ? "bg-gradient-to-r from-primary-yellow to-primary-orange text-white font-semibold shadow-lg" 
                        : "text-foreground hover:bg-muted hover:text-foreground font-medium"
                    )}
                    onClick={() => handleNavigation("/blog")}
                  >
                    <BookOpen className="h-5 w-5" />
                    <span>Blog</span>
                  </button>
                )}

                <button
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left",
                    isActive("/faq") 
                      ? "bg-gradient-to-r from-primary-yellow to-primary-orange text-white font-semibold shadow-lg" 
                      : "text-foreground hover:bg-muted hover:text-foreground font-medium"
                  )}
                  onClick={() => handleNavigation("/faq")}
                >
                  <HelpCircle className="h-5 w-5" />
                  <span>FAQ</span>
                </button>

                {showCommunityPage && (
                  <button
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left",
                      isActive("/community") 
                        ? "bg-gradient-to-r from-primary-yellow to-primary-orange text-white font-semibold shadow-lg" 
                        : "text-foreground hover:bg-muted hover:text-foreground font-medium"
                    )}
                    onClick={() => handleNavigation("/community")}
                  >
                    <Users className="h-5 w-5" />
                    <span>Community</span>
                  </button>
                )}
              </>
            )}

            {/* Account Section - Always visible when logged in */}
            {user && (
              <>
                <div className="text-xs font-bold text-foreground/60 mt-4 mb-2 px-2">ACCOUNT</div>
                
                <button
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left",
                    isActive("/dashboard/settings") 
                      ? "bg-gradient-to-r from-primary-yellow to-primary-orange text-white font-semibold shadow-lg" 
                      : "text-foreground hover:bg-muted hover:text-foreground font-medium"
                  )}
                  onClick={() => handleNavigation("/dashboard/settings")}
                >
                  <Settings className="h-5 w-5" />
                  <span>Settings</span>
                </button>

                {isAdmin && (
                  <button
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left",
                      isActive("/admin/dashboard") 
                        ? "bg-gradient-to-r from-primary-yellow to-primary-orange text-white font-semibold shadow-lg" 
                        : "text-foreground hover:bg-muted hover:text-foreground font-medium"
                    )}
                    onClick={() => handleNavigation("/admin/dashboard")}
                  >
                    <Shield className="h-5 w-5" />
                    <span>Admin Panel</span>
                  </button>
                )}

                <button
                  className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left text-destructive hover:bg-destructive/10"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-5 w-5" />
                  <span>Sign Out</span>
                </button>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
