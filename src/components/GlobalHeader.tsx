import { Link, useNavigate } from "react-router-dom";
import { Coins, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useUserCredits } from "@/hooks/useUserCredits";

import { MobileMenu } from "@/components/MobileMenu";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { OptimizedImage } from "@/components/ui/optimized-image";
import logoImage from "@/assets/logo.png";
import { StudioDropdown, LibraryDropdown, NavDropdownProvider } from "@/components/navigation";

export const GlobalHeader = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useAdminRole();
  const { availableCredits, isLoading } = useUserCredits();
  
  const creditBalance = isLoading ? null : availableCredits;
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
      isScrolled 
        ? "backdrop-blur-xl bg-background/95 shadow-lg border-b border-border/30" 
        : "backdrop-blur-md bg-background/90"
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
            <span className="text-xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              artifio.ai
            </span>
          </Link>

          {/* Center - Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {user ? (
              <NavDropdownProvider>
                <StudioDropdown align="center" />
                <LibraryDropdown align="center" />
              </NavDropdownProvider>
            ) : (
              <Link 
                to="/models"
                className="px-4 py-2 rounded-full backdrop-blur-lg bg-card/80 border border-border/30 text-foreground hover:bg-card/95 transition-all duration-300 hover:scale-105 shadow-md font-semibold"
              >
                Models
              </Link>
            )}
          </nav>

          {/* Right Side - Actions */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />

            {!user && (
              <button
                onClick={() => navigate("/auth")}
                className="px-4 py-2 rounded-full backdrop-blur-lg bg-card/80 border border-border/30 text-foreground hover:bg-card/95 transition-all duration-300 hover:scale-105 shadow-md font-semibold"
              >
                Login
              </button>
            )}


            {user && creditBalance !== null && (
              <button
                onClick={() => navigate("/dashboard/settings", { state: { defaultTab: 'credits' } })}
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

          {/* Mobile Menu */}
          <div className="md:hidden">
            <MobileMenu creditBalance={creditBalance ?? undefined} />
          </div>
        </div>
      </nav>
    </header>
  );
};
