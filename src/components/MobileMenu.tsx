import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Menu, Home, Wand2, Shield,
  Sparkles, LayoutTemplate, DollarSign, Info, BookOpen, HelpCircle, Users, Video, Clock, Clapperboard, Film, Cpu
} from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { SignedInHamburgerMenuContent } from "@/components/navigation/mobile/SignedInHamburgerMenuContent";

export const MobileMenu = ({ creditBalance: _creditBalance }: { creditBalance?: number }) => {
  const { user } = useAuth();
  const { isAdmin } = useAdminRole();
  const { isFeatureEnabled, isFeatureComingSoon, isPageEnabled } = useFeatureFlags();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  
  const showFeaturesPage = isPageEnabled('features');
  const showBlogPage = isPageEnabled('blog');
  const showCommunityPage = isPageEnabled('community');

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
  
  // Show dashboard-style menu when logged in (regardless of current page)
  const showDashboardMenu = isDashboard || !!user;

  // Reusable menu item component (for logged-out state)
  const MenuItem = ({ 
    path, 
    label, 
    icon, 
    showAdminIndicator = false 
  }: { 
    path: string; 
    label: string; 
    icon: React.ReactNode; 
    showAdminIndicator?: boolean;
  }) => (
    <button
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-colors text-sm w-full text-left",
        isActive(path)
          ? "bg-primary text-primary-foreground"
          : "hover:bg-muted"
      )}
      onClick={() => handleNavigation(path)}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
      {showAdminIndicator && (
        <Shield className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
      )}
    </button>
  );

  const renderFeatureItem = (
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
          className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-left opacity-50 cursor-not-allowed text-muted-foreground text-sm font-bold"
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
      <MenuItem 
        key={path}
        path={path} 
        label={label} 
        icon={icon} 
        showAdminIndicator={showAdminIndicator} 
      />
    );
  };

  // Section header component (non-collapsible)
  const SectionHeader = ({ children }: { children: React.ReactNode }) => (
    <div className="text-sm font-black text-muted-foreground uppercase tracking-wide mb-2 px-4 pt-6 first:pt-4">
      {children}
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" title="Open menu" className="brutal-card-sm lg:hidden">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72 p-0 bg-background border-l">
        {/* Header */}
        <div className="p-4 border-b">
          <h2 className="text-lg font-black">MENU</h2>
        </div>

        <ScrollArea className="flex-1 h-[calc(100vh-80px)]">
          <div className="flex flex-col pb-6">
            {/* Dashboard Context - shown when logged in */}
            {showDashboardMenu ? (
              <SignedInHamburgerMenuContent
                isActive={isActive}
                onNavigate={handleNavigation}
                onSignOut={handleSignOut}
                isAdmin={isAdmin}
                isFeatureEnabled={isFeatureEnabled}
                isFeatureComingSoon={isFeatureComingSoon}
                showHomeLink={!isDashboard}
              />
            ) : (
              <>
                {/* Public Pages Context (logged out) */}
                <div className="px-4 pt-4">
                  <MenuItem path="/" label="Home" icon={<Home className="h-4 w-4" />} />
                </div>

                {/* PRODUCT Section */}
                <SectionHeader>PRODUCT</SectionHeader>
                <div className="space-y-1 px-4">
                  {showFeaturesPage && (
                    <MenuItem path="/features" label="Features" icon={<Sparkles className="h-4 w-4" />} />
                  )}
                  {renderFeatureItem(
                    "/dashboard/templates",
                    "Templates",
                    <LayoutTemplate className="h-4 w-4" />,
                    "templates"
                  )}
                  {renderFeatureItem(
                    "/dashboard/custom-creation",
                    "Custom Creation",
                    <Wand2 className="h-4 w-4" />,
                    "custom_creation"
                  )}
                  <MenuItem path="/pricing" label="Pricing" icon={<DollarSign className="h-4 w-4" />} />
                  {renderFeatureItem(
                    "/dashboard/storyboard",
                    "Storyboard",
                    <Film className="h-4 w-4" />,
                    "storyboard"
                  )}
                  {renderFeatureItem(
                    "/dashboard/video-studio",
                    "Faceless Videos",
                    <Video className="h-4 w-4" />,
                    "faceless_videos"
                  )}
                </div>

                {/* RESOURCES Section */}
                <SectionHeader>RESOURCES</SectionHeader>
                <div className="space-y-1 px-4">
                  <MenuItem path="/models" label="Models" icon={<Cpu className="h-4 w-4" />} />
                  <MenuItem 
                    path="/dashboard/video-editor" 
                    label="Video Editor" 
                    icon={<Clapperboard className="h-4 w-4" />} 
                  />
                  <MenuItem path="/about" label="About" icon={<Info className="h-4 w-4" />} />
                  {showBlogPage && (
                    <MenuItem path="/blog" label="Blog" icon={<BookOpen className="h-4 w-4" />} />
                  )}
                  <MenuItem path="/faq" label="FAQ" icon={<HelpCircle className="h-4 w-4" />} />
                  {showCommunityPage && (
                    <MenuItem path="/community" label="Community" icon={<Users className="h-4 w-4" />} />
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
