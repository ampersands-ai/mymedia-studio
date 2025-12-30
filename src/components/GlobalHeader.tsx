import { Link, useNavigate } from "react-router-dom";
import { Coins, Shield, ChevronDown, Sparkles, History, Video, BookOpen, LayoutTemplate, Wand2, MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useUserCredits } from "@/hooks/useUserCredits";

import { MobileMenu } from "@/components/MobileMenu";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { OptimizedImage } from "@/components/ui/optimized-image";
import logoImage from "@/assets/logo.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
        ? "backdrop-blur-xl bg-card/80 shadow-lg border-b border-border/30" 
        : "backdrop-blur-sm bg-black/20"
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
            {user && (
              <>
                {/* Create Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-1 text-white/90 hover:text-primary-orange transition-colors font-medium drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]">
                    <Sparkles className="h-4 w-4" />
                    Create
                    <ChevronDown className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-48 bg-card border-border z-[60]">
                    <DropdownMenuItem onClick={() => navigate("/dashboard/custom-creation")} className="cursor-pointer">
                      <Wand2 className="h-4 w-4 mr-2" />
                      Custom Creation
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/dashboard/templates")} className="cursor-pointer">
                      <LayoutTemplate className="h-4 w-4 mr-2" />
                      Templates
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/dashboard/videos")} className="cursor-pointer">
                      <Video className="h-4 w-4 mr-2" />
                      Videos
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/dashboard/storyboard")} className="cursor-pointer">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Storyboard
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Library Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-1 text-white/90 hover:text-primary-orange transition-colors font-medium drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]">
                    <History className="h-4 w-4" />
                    Library
                    <ChevronDown className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-48 bg-card border-border z-[60]">
                    <DropdownMenuItem onClick={() => navigate("/dashboard/creations")} className="cursor-pointer">
                      <History className="h-4 w-4 mr-2" />
                      History
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/dashboard/prompts")} className="cursor-pointer">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Prompts
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
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

          {/* Mobile Menu */}
          <div className="md:hidden">
            <MobileMenu creditBalance={creditBalance ?? undefined} />
          </div>
        </div>
      </nav>
    </header>
  );
};
