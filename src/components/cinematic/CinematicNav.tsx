import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, Home, Sparkles, Layout, History, Video, FileText, Info, BookOpen, HelpCircle, Users, Settings, LogOut, Shield, Clock } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const navigate = useNavigate();
  const location = useLocation();

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
          className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-left opacity-50 cursor-not-allowed text-white/50"
        >
          <div className="flex items-center gap-3">
            {icon}
            <span>{label}</span>
          </div>
          <span className="flex items-center gap-1 text-xs text-white/50">
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
          "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 text-left",
          isActive(path) 
            ? "bg-gradient-to-r from-primary-yellow to-primary-orange text-white font-semibold shadow-lg" 
            : "text-white/70 hover:text-white hover:bg-white/10 font-medium"
        )}
        onClick={() => handleNavigation(path)}
      >
        {icon}
        <span>{label}</span>
        {showAdminIndicator && (
          <Shield className="h-3.5 w-3.5 ml-auto text-white/50" />
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

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-8">
          {visibleNavItems.map((item) => (
            <Link
              key={item.id}
              to={item.href}
              className="text-sm font-medium uppercase tracking-wide transition-colors py-2 text-white/70 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Desktop CTA + Theme Toggle */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          {user ? (
            <Link
              to="/dashboard/custom-creation"
              className="px-5 py-2 text-sm font-bold uppercase tracking-wide text-foreground bg-gradient-to-r from-primary-yellow to-primary-orange hover:shadow-lg hover:shadow-primary-orange/30 transition-all rounded-2xl"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              to="/auth"
              className="px-5 py-2 text-sm font-bold uppercase tracking-wide text-foreground bg-gradient-to-r from-primary-yellow to-primary-orange hover:shadow-lg hover:shadow-primary-orange/30 transition-all rounded-2xl"
            >
              Sign In
            </Link>
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
              className="w-[300px] bg-black/95 backdrop-blur-xl border-l border-white/10 p-0"
            >
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                  <Link to="/" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
                    <img 
                      src="/logos/artifio.png" 
                      alt="Artifio" 
                      className="h-7 w-auto"
                    />
                    <span className="text-lg font-bold text-white">artifio.ai</span>
                  </Link>
                  <ThemeToggle />
                </div>

                {/* Nav Links - Different content based on login status */}
                <ScrollArea className="flex-1 py-4">
                  <div className="flex flex-col gap-2 px-6">
                    {user ? (
                      <>
                        {/* Dashboard Menu for logged-in users */}
                        <button
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 text-left",
                            isActive("/") 
                              ? "bg-gradient-to-r from-primary-yellow to-primary-orange text-white font-semibold shadow-lg" 
                              : "text-white/70 hover:text-white hover:bg-white/10 font-medium"
                          )}
                          onClick={() => handleNavigation("/")}
                        >
                          <Home className="h-5 w-5" />
                          <span>Home</span>
                        </button>

                        <div className="text-xs font-bold text-white/60 mt-4 mb-2 px-2">DASHBOARD</div>

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
                            "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 text-left",
                            isActive("/dashboard/history") 
                              ? "bg-gradient-to-r from-primary-yellow to-primary-orange text-white font-semibold shadow-lg" 
                              : "text-white/70 hover:text-white hover:bg-white/10 font-medium"
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

                        <button
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 text-left",
                            isActive("/dashboard/prompts") 
                              ? "bg-gradient-to-r from-primary-yellow to-primary-orange text-white font-semibold shadow-lg" 
                              : "text-white/70 hover:text-white hover:bg-white/10 font-medium"
                          )}
                          onClick={() => handleNavigation("/dashboard/prompts")}
                        >
                          <FileText className="h-5 w-5" />
                          <span>Prompt Library</span>
                        </button>

                        <div className="text-xs font-bold text-white/60 mt-4 mb-2 px-2">RESOURCES</div>

                        <button
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 text-left",
                            isActive("/about") 
                              ? "bg-gradient-to-r from-primary-yellow to-primary-orange text-white font-semibold shadow-lg" 
                              : "text-white/70 hover:text-white hover:bg-white/10 font-medium"
                          )}
                          onClick={() => handleNavigation("/about")}
                        >
                          <Info className="h-5 w-5" />
                          <span>About</span>
                        </button>

                        {showBlogPage && (
                          <button
                            className={cn(
                              "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 text-left",
                              isActive("/blog") 
                                ? "bg-gradient-to-r from-primary-yellow to-primary-orange text-white font-semibold shadow-lg" 
                                : "text-white/70 hover:text-white hover:bg-white/10 font-medium"
                            )}
                            onClick={() => handleNavigation("/blog")}
                          >
                            <BookOpen className="h-5 w-5" />
                            <span>Blog</span>
                          </button>
                        )}

                        <button
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 text-left",
                            isActive("/faq") 
                              ? "bg-gradient-to-r from-primary-yellow to-primary-orange text-white font-semibold shadow-lg" 
                              : "text-white/70 hover:text-white hover:bg-white/10 font-medium"
                          )}
                          onClick={() => handleNavigation("/faq")}
                        >
                          <HelpCircle className="h-5 w-5" />
                          <span>FAQ</span>
                        </button>

                        {showCommunityPage && (
                          <button
                            className={cn(
                              "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 text-left",
                              isActive("/community") 
                                ? "bg-gradient-to-r from-primary-yellow to-primary-orange text-white font-semibold shadow-lg" 
                                : "text-white/70 hover:text-white hover:bg-white/10 font-medium"
                            )}
                            onClick={() => handleNavigation("/community")}
                          >
                            <Users className="h-5 w-5" />
                            <span>Community</span>
                          </button>
                        )}

                        <div className="text-xs font-bold text-white/60 mt-4 mb-2 px-2">ACCOUNT</div>

                        <button
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 text-left",
                            isActive("/dashboard/settings") 
                              ? "bg-gradient-to-r from-primary-yellow to-primary-orange text-white font-semibold shadow-lg" 
                              : "text-white/70 hover:text-white hover:bg-white/10 font-medium"
                          )}
                          onClick={() => handleNavigation("/dashboard/settings")}
                        >
                          <Settings className="h-5 w-5" />
                          <span>Settings</span>
                        </button>

                        {isAdmin && (
                          <button
                            className={cn(
                              "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 text-left",
                              isActive("/dashboard/admin") 
                                ? "bg-gradient-to-r from-primary-yellow to-primary-orange text-white font-semibold shadow-lg" 
                                : "text-white/70 hover:text-white hover:bg-white/10 font-medium"
                            )}
                            onClick={() => handleNavigation("/dashboard/admin")}
                          >
                            <Shield className="h-5 w-5" />
                            <span>Admin Panel</span>
                          </button>
                        )}

                        <button
                          className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 text-left text-red-400 hover:text-red-300 hover:bg-white/10 font-medium"
                          onClick={handleSignOut}
                        >
                          <LogOut className="h-5 w-5" />
                          <span>Sign Out</span>
                        </button>
                      </>
                    ) : (
                      <>
                        {/* Marketing Menu for logged-out users */}
                        {visibleNavItems.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => handleNavigation(item.href)}
                            className="text-lg font-medium uppercase tracking-wide py-4 text-white/70 hover:text-white hover:pl-2 transition-all border-b border-white/5"
                          >
                            {item.label}
                          </button>
                        ))}
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
