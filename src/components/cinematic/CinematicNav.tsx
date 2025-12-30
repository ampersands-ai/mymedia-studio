import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, Home, Sparkles, Layout, History, Video, FileText, Info, BookOpen, HelpCircle, Users, Settings, LogOut, Shield, Clock, Coins, ChevronDown, LayoutTemplate, MessageSquare, Palette, ImagePlus, Film, Music, CircleUser, Repeat } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useUserCredits } from "@/hooks/useUserCredits";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { id: "features", label: "Features", href: "/features" },
  { id: "pricing", label: "Pricing", href: "/pricing" },
  { id: "blog", label: "Blog", href: "/blog" },
] as const;

export const CinematicNav = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { isAdmin } = useAdminRole();
  const { isFeatureEnabled, isFeatureComingSoon, isPageEnabled } = useFeatureFlags();
  const { availableCredits, isLoading: creditsLoading } = useUserCredits();
  const navigate = useNavigate();
  const location = useLocation();

  const creditBalance = creditsLoading ? null : availableCredits;
  const showBlogPage = isPageEnabled('blog');
  const showCommunityPage = isPageEnabled('community');

  const visibleNavItems = navItems.filter((item) => {
    if (item.id === "pricing") return true;
    if (item.id === "features") return isPageEnabled("features");
    if (item.id === "blog") return isPageEnabled("blog");
    return false;
  }) as ReadonlyArray<(typeof navItems)[number]>;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavigation = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setIsOpen(false);
      navigate("/");
      toast.success("Signed out successfully");
    } catch {
      toast.error("Error signing out");
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const renderFeatureButton = (
    path: string,
    label: string,
    icon: React.ReactNode,
    featureId: 'templates' | 'custom_creation' | 'faceless_videos' | 'storyboard'
  ) => {
    const enabled = isFeatureEnabled(featureId);
    const comingSoon = isFeatureComingSoon(featureId);

    if (!enabled && !isAdmin) return null;

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

    const showAdminIndicator = isAdmin && (!enabled || comingSoon);

    return (
      <button
        key={path}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-colors text-sm w-full text-left",
          isActive(path) 
            ? "bg-primary text-primary-foreground" 
            : "hover:bg-muted"
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
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-black/90 backdrop-blur-md border-b border-white/10"
          : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <img 
            src="/logos/artifio.png" 
            alt="Artifio" 
            className="h-8 w-auto"
          />
          <span className="text-xl font-bold text-white">artifio.ai</span>
        </Link>

        {/* Desktop Nav Links - Different for logged in vs logged out */}
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <>
              {/* Studio Dropdown - Grand pill button with all creation groups */}
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-primary-yellow to-primary-orange text-neutral-900 font-bold text-base shadow-lg shadow-primary-orange/30 hover:shadow-xl hover:shadow-primary-orange/40 hover:scale-105 transition-all duration-300">
                  <Sparkles className="h-5 w-5" />
                  Studio
                  <ChevronDown className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-80 p-4 bg-card/95 backdrop-blur-xl border-2 border-primary-orange/30 z-[60] shadow-2xl shadow-primary-orange/20 rounded-2xl">
                  <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-2">Generate Content</DropdownMenuLabel>
                  <div className="grid grid-cols-2 gap-2">
                    <DropdownMenuItem onClick={() => navigate("/dashboard/custom-creation?group=image_editing")} className="cursor-pointer flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-primary-orange/10 h-auto">
                      <Palette className="h-6 w-6 text-primary-orange" />
                      <div className="text-center">
                        <div className="font-semibold text-sm">Image to Image</div>
                        <div className="text-[10px] text-muted-foreground">Image Editing</div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/dashboard/custom-creation?group=prompt_to_image")} className="cursor-pointer flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-primary-orange/10 h-auto">
                      <ImagePlus className="h-6 w-6 text-primary-orange" />
                      <div className="text-center">
                        <div className="font-semibold text-sm">Text to Image</div>
                        <div className="text-[10px] text-muted-foreground">No reference</div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/dashboard/custom-creation?group=prompt_to_video")} className="cursor-pointer flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-primary-orange/10 h-auto">
                      <Video className="h-6 w-6 text-primary-orange" />
                      <div className="text-center">
                        <div className="font-semibold text-sm">Text to Video</div>
                        <div className="text-[10px] text-muted-foreground">No reference</div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/dashboard/custom-creation?group=image_to_video")} className="cursor-pointer flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-primary-orange/10 h-auto">
                      <Film className="h-6 w-6 text-primary-orange" />
                      <div className="text-center">
                        <div className="font-semibold text-sm">Image to Video</div>
                        <div className="text-[10px] text-muted-foreground">Image referenced</div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/dashboard/custom-creation?group=video_to_video")} className="cursor-pointer flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-primary-orange/10 h-auto">
                      <Repeat className="h-6 w-6 text-primary-orange" />
                      <div className="text-center">
                        <div className="font-semibold text-sm">Video to Video</div>
                        <div className="text-[10px] text-muted-foreground">Video editing</div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/dashboard/custom-creation?group=lip_sync")} className="cursor-pointer flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-primary-orange/10 h-auto">
                      <CircleUser className="h-6 w-6 text-primary-orange" />
                      <div className="text-center">
                        <div className="font-semibold text-sm">Custom Avatar</div>
                        <div className="text-[10px] text-muted-foreground">Audio to video</div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/dashboard/custom-creation?group=prompt_to_audio")} className="cursor-pointer flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-primary-orange/10 h-auto col-span-2">
                      <Music className="h-6 w-6 text-primary-orange" />
                      <div className="text-center">
                        <div className="font-semibold text-sm">Audio Studio</div>
                        <div className="text-[10px] text-muted-foreground">Sounds to songs</div>
                      </div>
                    </DropdownMenuItem>
                  </div>
                  <DropdownMenuSeparator className="my-3" />
                  <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-2">More Tools</DropdownMenuLabel>
                  <div className="space-y-1">
                    <DropdownMenuItem onClick={() => navigate("/dashboard/templates")} className="cursor-pointer flex items-center gap-3 p-3 rounded-xl hover:bg-primary-orange/10">
                      <LayoutTemplate className="h-5 w-5 text-primary-orange" />
                      <div>
                        <div className="font-semibold text-sm">Templates</div>
                        <div className="text-[10px] text-muted-foreground">Pre-built workflows</div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/dashboard/storyboard")} className="cursor-pointer flex items-center gap-3 p-3 rounded-xl hover:bg-primary-orange/10">
                      <BookOpen className="h-5 w-5 text-primary-orange" />
                      <div>
                        <div className="font-semibold text-sm">Storyboard</div>
                        <div className="text-[10px] text-muted-foreground">Visual storytelling</div>
                      </div>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Library Dropdown - Grand pill button */}
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold text-base shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 hover:scale-105 transition-all duration-300">
                  <History className="h-5 w-5" />
                  Library
                  <ChevronDown className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-64 p-4 bg-card/95 backdrop-blur-xl border-2 border-purple-500/30 z-[60] shadow-2xl shadow-purple-500/20 rounded-2xl">
                  <div className="space-y-2">
                    <DropdownMenuItem onClick={() => navigate("/dashboard/creations")} className="cursor-pointer flex items-center gap-3 p-4 rounded-xl hover:bg-purple-500/10">
                      <History className="h-6 w-6 text-purple-500" />
                      <div>
                        <div className="font-semibold text-base">History</div>
                        <div className="text-xs text-muted-foreground">View your creations</div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/dashboard/prompts")} className="cursor-pointer flex items-center gap-3 p-4 rounded-xl hover:bg-purple-500/10">
                      <MessageSquare className="h-6 w-6 text-purple-500" />
                      <div>
                        <div className="font-semibold text-base">Prompts</div>
                        <div className="text-xs text-muted-foreground">Saved prompt library</div>
                      </div>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            visibleNavItems.map((item) => (
              <Link
                key={item.id}
                to={item.href}
                className="text-sm font-medium uppercase tracking-wide transition-colors py-2 text-white/70 hover:text-white"
              >
                {item.label}
              </Link>
            ))
          )}
        </div>

        {/* Desktop CTA + Theme Toggle */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          
          {!user && (
            <Link
              to="/auth"
              className="px-5 py-2 text-sm font-bold uppercase tracking-wide text-foreground bg-gradient-to-r from-primary-yellow to-primary-orange hover:shadow-lg hover:shadow-primary-orange/30 transition-all rounded-2xl"
            >
              Sign In
            </Link>
          )}

          {creditBalance !== null && (
            <button
              onClick={() => navigate("/dashboard/settings", { state: { defaultTab: 'usage' } })}
              className="px-4 py-2 rounded-full backdrop-blur-lg bg-card/80 border border-border/30 flex items-center gap-2 hover:bg-card/95 transition-all duration-300 hover:scale-105 shadow-md"
            >
              <Coins className="h-5 w-5 text-primary-orange" />
              <span className="font-bold text-base">
                {creditBalance.toLocaleString()}
              </span>
            </button>
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

        {/* Mobile: Quick action + Menu */}
        <div className="md:hidden flex items-center gap-2">
          {user ? (
            <Link
              to="/dashboard/custom-creation"
              className="h-7 flex items-center px-3 text-xs font-bold uppercase tracking-wide leading-none text-foreground bg-gradient-to-r from-primary-yellow to-primary-orange rounded-xl"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              to="/auth"
              className="h-7 flex items-center px-3 text-xs font-bold uppercase tracking-wide leading-none text-foreground bg-gradient-to-r from-primary-yellow to-primary-orange rounded-xl"
            >
              Login
            </Link>
          )}
          
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <button
                className="p-2 text-white hover:bg-white/10 transition-colors"
                aria-label="Open menu"
              >
                <Menu className="w-6 h-6" />
              </button>
            </SheetTrigger>
            <SheetContent 
              side="right" 
              className="w-72 p-0 bg-background border-l"
            >
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-black">MENU</h2>
                    <ThemeToggle />
                  </div>
                </div>

                {/* Mobile Nav Links - Different content based on login status */}
                <ScrollArea className="flex-1">
                  <div className="flex flex-col pb-6">
                    {user ? (
                      <>
                        {/* Home link */}
                        <div className="px-4 pt-4">
                          <button
                            className={cn(
                              "flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-colors text-sm w-full text-left",
                              isActive("/")
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-muted"
                            )}
                            onClick={() => handleNavigation("/")}
                          >
                            <Home className="h-4 w-4" />
                            <span>Home</span>
                          </button>
                        </div>

                        {/* CREATE Section */}
                        <div className="text-sm font-black text-muted-foreground uppercase tracking-wide mb-2 px-4 pt-6">CREATE</div>
                        <div className="space-y-1 px-4">
                          {renderFeatureButton(
                            "/dashboard/custom-creation",
                            "Custom Creation",
                            <Sparkles className="h-4 w-4" />,
                            "custom_creation"
                          )}
                          {renderFeatureButton(
                            "/dashboard/storyboard",
                            "Storyboard",
                            <span className="text-base">🎬</span>,
                            "storyboard"
                          )}
                          {renderFeatureButton(
                            "/dashboard/video-studio",
                            "Faceless Videos",
                            <Video className="h-4 w-4" />,
                            "faceless_videos"
                          )}
                          {renderFeatureButton(
                            "/dashboard/templates",
                            "Templates",
                            <Layout className="h-4 w-4" />,
                            "templates"
                          )}
                          <button
                            className={cn(
                              "flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-colors text-sm w-full text-left",
                              isActive("/dashboard/history")
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-muted"
                            )}
                            onClick={() => handleNavigation("/dashboard/history")}
                          >
                            <History className="h-4 w-4" />
                            <span>My Creations</span>
                          </button>
                        </div>

                        {/* RESOURCES Section */}
                        <div className="text-sm font-black text-muted-foreground uppercase tracking-wide mb-2 px-4 pt-6">RESOURCES</div>
                        <div className="space-y-1 px-4">
                          <button
                            className={cn(
                              "flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-colors text-sm w-full text-left",
                              isActive("/dashboard/prompts")
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-muted"
                            )}
                            onClick={() => handleNavigation("/dashboard/prompts")}
                          >
                            <FileText className="h-4 w-4" />
                            <span>Prompt Library</span>
                          </button>
                          <button
                            className={cn(
                              "flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-colors text-sm w-full text-left",
                              isActive("/about")
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-muted"
                            )}
                            onClick={() => handleNavigation("/about")}
                          >
                            <Info className="h-4 w-4" />
                            <span>About</span>
                          </button>
                          {showBlogPage && (
                            <button
                              className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-colors text-sm w-full text-left",
                                isActive("/blog")
                                  ? "bg-primary text-primary-foreground"
                                  : "hover:bg-muted"
                              )}
                              onClick={() => handleNavigation("/blog")}
                            >
                              <BookOpen className="h-4 w-4" />
                              <span>Blog</span>
                            </button>
                          )}
                          <button
                            className={cn(
                              "flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-colors text-sm w-full text-left",
                              isActive("/faq")
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-muted"
                            )}
                            onClick={() => handleNavigation("/faq")}
                          >
                            <HelpCircle className="h-4 w-4" />
                            <span>FAQ</span>
                          </button>
                          {showCommunityPage && (
                            <button
                              className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-colors text-sm w-full text-left",
                                isActive("/community")
                                  ? "bg-primary text-primary-foreground"
                                  : "hover:bg-muted"
                              )}
                              onClick={() => handleNavigation("/community")}
                            >
                              <Users className="h-4 w-4" />
                              <span>Community</span>
                            </button>
                          )}
                        </div>

                        {/* ACCOUNT Section */}
                        <div className="text-sm font-black text-muted-foreground uppercase tracking-wide mb-2 px-4 pt-6">ACCOUNT</div>
                        <div className="space-y-1 px-4">
                          <button
                            className={cn(
                              "flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-colors text-sm w-full text-left",
                              isActive("/dashboard/settings")
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-muted"
                            )}
                            onClick={() => handleNavigation("/dashboard/settings")}
                          >
                            <Settings className="h-4 w-4" />
                            <span>Settings</span>
                          </button>
                          {isAdmin && (
                            <button
                              className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-colors text-sm w-full text-left",
                                isActive("/admin/dashboard")
                                  ? "bg-primary text-primary-foreground"
                                  : "hover:bg-muted"
                              )}
                              onClick={() => handleNavigation("/admin/dashboard")}
                            >
                              <Shield className="h-4 w-4" />
                              <span>Admin Panel</span>
                            </button>
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
                        {/* Marketing Menu for logged-out users */}
                        <div className="px-4 pt-4">
                          <button
                            className={cn(
                              "flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-colors text-sm w-full text-left",
                              isActive("/")
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-muted"
                            )}
                            onClick={() => handleNavigation("/")}
                          >
                            <Home className="h-4 w-4" />
                            <span>Home</span>
                          </button>
                        </div>
                        <div className="text-sm font-black text-muted-foreground uppercase tracking-wide mb-2 px-4 pt-6">PAGES</div>
                        <div className="space-y-1 px-4">
                          {visibleNavItems.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => handleNavigation(item.href)}
                              className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-colors text-sm w-full text-left",
                                isActive(item.href)
                                  ? "bg-primary text-primary-foreground"
                                  : "hover:bg-muted"
                              )}
                            >
                              <span>{item.label}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </ScrollArea>

                {/* CTA */}
                {!user && (
                  <div className="p-6 border-t border-white/10">
                    <Link
                      to="/auth"
                      onClick={() => setIsOpen(false)}
                      className="block w-full text-center px-5 py-4 text-sm font-bold uppercase tracking-wide text-foreground bg-gradient-to-r from-primary-yellow to-primary-orange hover:shadow-lg hover:shadow-primary-orange/30 transition-all rounded-2xl"
                    >
                      Sign In
                    </Link>
                    <Link
                      to="/auth?mode=signup"
                      onClick={() => setIsOpen(false)}
                      className="block w-full text-center px-5 py-4 mt-3 text-sm font-medium uppercase tracking-wide text-white border border-white/30 hover:bg-white/10 transition-all rounded-2xl"
                    >
                      Sign Up Free
                    </Link>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};
