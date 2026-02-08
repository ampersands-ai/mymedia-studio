import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Menu, Home, Coins, Shield, Cpu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useUserCredits } from "@/hooks/useUserCredits";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { StudioDropdown, LibraryDropdown, NavDropdownProvider } from "@/components/navigation";
import { SignedInHamburgerMenuContent } from "@/components/navigation/mobile/SignedInHamburgerMenuContent";
import { brand } from "@/config/brand";

const navItems = [
  { id: "models", label: "Models", href: "/models" },
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
  const router = useRouter();
  const pathname = usePathname();

  const creditBalance = creditsLoading ? null : availableCredits;

  const visibleNavItems = navItems.filter((item) => {
    if (item.id === "models") return true;
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
    router.push(path);
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setIsOpen(false);
      router.push("/");
      toast.success("Signed out successfully");
    } catch {
      toast.error("Error signing out");
    }
  };

  const isActive = (path: string) => pathname === path;

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-background/40 backdrop-blur-md border-b border-white/5 shadow-md shadow-black/10"
          : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <img
            src={brand.logoPath}
            alt={brand.name}
            className="h-8 w-auto"
          />
          <span className="text-xl font-bold text-white">{brand.name}</span>
        </Link>

        {/* Desktop Nav Links - Different for logged in vs logged out */}
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <NavDropdownProvider>
              <StudioDropdown align="center" />
              <LibraryDropdown align="center" />
            </NavDropdownProvider>
          ) : (
            visibleNavItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
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
              href="/auth"
              className="px-5 py-2 text-sm font-bold uppercase tracking-wide text-foreground bg-gradient-to-r from-primary-yellow to-primary-orange hover:shadow-lg hover:shadow-primary-orange/30 transition-all rounded-2xl"
            >
              Sign In
            </Link>
          )}

          {user && creditBalance !== null && (
            <button
              onClick={() => router.push("/dashboard/settings?tab=credits")}
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
              onClick={() => router.push("/admin/dashboard")}
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
              href="/dashboard/custom-creation"
              className="h-7 flex items-center px-3 text-xs font-bold uppercase tracking-wide leading-none text-foreground bg-gradient-to-r from-primary-yellow to-primary-orange rounded-xl"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              href="/auth"
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
                      <SignedInHamburgerMenuContent
                        isActive={isActive}
                        onNavigate={handleNavigation}
                        onSignOut={handleSignOut}
                        isAdmin={isAdmin}
                        isFeatureEnabled={isFeatureEnabled}
                        isFeatureComingSoon={isFeatureComingSoon}
                        isPageEnabled={isPageEnabled}
                        showHomeLink={true}
                      />
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
                          <button
                            onClick={() => handleNavigation("/models")}
                            className={cn(
                              "flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-colors text-sm w-full text-left",
                              isActive("/models")
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-muted"
                            )}
                          >
                            <Cpu className="h-4 w-4" />
                            <span>Models</span>
                          </button>
                          {visibleNavItems.filter(item => item.id !== "models").map((item) => (
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
                      href="/auth"
                      onClick={() => setIsOpen(false)}
                      className="block w-full text-center px-5 py-4 text-sm font-bold uppercase tracking-wide text-foreground bg-gradient-to-r from-primary-yellow to-primary-orange hover:shadow-lg hover:shadow-primary-orange/30 transition-all rounded-2xl"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/auth?mode=signup"
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
