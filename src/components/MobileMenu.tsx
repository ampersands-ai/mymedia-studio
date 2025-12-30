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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Menu, Home, Wand2, Settings, LogOut, Shield,
  Sparkles, LayoutTemplate, DollarSign, Info, BookOpen, HelpCircle, Users, History, Video, Clock, Clapperboard, Film,
  ChevronDown, Palette, ImagePlus, Music, CircleUser, Repeat, FolderOpen
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
  const [studioOpen, setStudioOpen] = useState(true);
  const [libraryOpen, setLibraryOpen] = useState(true);
  
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

  // Reusable menu item component
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

  // Collapsible section header component
  const CollapsibleSectionHeader = ({ 
    children, 
    isOpen, 
    icon 
  }: { 
    children: React.ReactNode; 
    isOpen: boolean;
    icon: React.ReactNode;
  }) => (
    <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-black text-foreground uppercase tracking-wide px-4 py-3 hover:bg-muted/50 rounded-lg transition-colors">
      <div className="flex items-center gap-2">
        {icon}
        {children}
      </div>
      <ChevronDown className={cn(
        "h-4 w-4 transition-transform duration-200",
        isOpen && "rotate-180"
      )} />
    </CollapsibleTrigger>
  );

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
              <>
                {/* Home link when on public pages */}
                {!isDashboard && (
                  <div className="px-4 pt-4">
                    <MenuItem path="/" label="Home" icon={<Home className="h-4 w-4" />} />
                  </div>
                )}

                {/* STUDIO Section - Collapsible */}
                <div className="pt-4 px-2">
                  <Collapsible open={studioOpen} onOpenChange={setStudioOpen}>
                    <CollapsibleSectionHeader isOpen={studioOpen} icon={<Sparkles className="h-4 w-4 text-primary-orange" />}>
                      Studio
                    </CollapsibleSectionHeader>
                    <CollapsibleContent className="space-y-1 px-2 pt-2">
                      {/* Image */}
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 pt-2">Image</p>
                      <MenuItem 
                        path="/dashboard/custom-creation?group=image_editing" 
                        label="Image to Image" 
                        icon={<Palette className="h-4 w-4" />} 
                      />
                      <MenuItem 
                        path="/dashboard/custom-creation?group=prompt_to_image" 
                        label="Text to Image" 
                        icon={<ImagePlus className="h-4 w-4" />} 
                      />

                      {/* Video */}
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 pt-3">Video</p>
                      <MenuItem 
                        path="/dashboard/custom-creation?group=prompt_to_video" 
                        label="Text to Video" 
                        icon={<Video className="h-4 w-4" />} 
                      />
                      <MenuItem 
                        path="/dashboard/custom-creation?group=image_to_video" 
                        label="Image to Video" 
                        icon={<Film className="h-4 w-4" />} 
                      />
                      <MenuItem 
                        path="/dashboard/custom-creation?group=video_to_video" 
                        label="Video to Video" 
                        icon={<Repeat className="h-4 w-4" />} 
                      />
                      <MenuItem 
                        path="/dashboard/custom-creation?group=lip_sync" 
                        label="Custom Avatar" 
                        icon={<CircleUser className="h-4 w-4" />} 
                      />

                      {/* Audio */}
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 pt-3">Audio</p>
                      <MenuItem 
                        path="/dashboard/custom-creation?group=prompt_to_audio" 
                        label="Audio Studio" 
                        icon={<Music className="h-4 w-4" />} 
                      />

                      {/* Editing */}
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 pt-3">Editing</p>
                      <MenuItem 
                        path="/dashboard/video-editor" 
                        label="Video Stitching" 
                        icon={<Clapperboard className="h-4 w-4" />} 
                      />

                      {/* Storytelling */}
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-4 pt-3">Storytelling</p>
                      {renderFeatureItem(
                        "/dashboard/video-studio",
                        "Faceless Videos",
                        <Video className="h-4 w-4" />,
                        "faceless_videos"
                      )}
                      {renderFeatureItem(
                        "/dashboard/storyboard",
                        "Storyboard",
                        <BookOpen className="h-4 w-4" />,
                        "storyboard"
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </div>

                {/* LIBRARY Section - Collapsible */}
                <div className="pt-2 px-2">
                  <Collapsible open={libraryOpen} onOpenChange={setLibraryOpen}>
                    <CollapsibleSectionHeader isOpen={libraryOpen} icon={<FolderOpen className="h-4 w-4 text-primary-orange" />}>
                      Library
                    </CollapsibleSectionHeader>
                    <CollapsibleContent className="space-y-1 px-2 pt-2">
                      {renderFeatureItem(
                        "/dashboard/templates",
                        "Templates",
                        <LayoutTemplate className="h-4 w-4" />,
                        "templates"
                      )}
                      <MenuItem 
                        path="/dashboard/history" 
                        label="My Creations" 
                        icon={<History className="h-4 w-4" />} 
                      />
                      <MenuItem 
                        path="/dashboard/prompts" 
                        label="Prompt Library" 
                        icon={<BookOpen className="h-4 w-4" />} 
                      />
                    </CollapsibleContent>
                  </Collapsible>
                </div>

                {/* ACCOUNT Section */}
                <SectionHeader>ACCOUNT</SectionHeader>
                <div className="space-y-1 px-4">
                  <MenuItem 
                    path="/dashboard/settings" 
                    label="Settings" 
                    icon={<Settings className="h-4 w-4" />} 
                  />
                  <MenuItem path="/about" label="About" icon={<Info className="h-4 w-4" />} />
                  <MenuItem path="/faq" label="FAQ" icon={<HelpCircle className="h-4 w-4" />} />
                  {isAdmin && (
                    <MenuItem 
                      path="/admin/dashboard" 
                      label="Admin Panel" 
                      icon={<Shield className="h-4 w-4" />} 
                    />
                  )}
                  <button
                    className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left text-destructive hover:bg-destructive/10 font-bold text-sm w-full"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
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
