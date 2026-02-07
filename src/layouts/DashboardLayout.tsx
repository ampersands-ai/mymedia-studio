import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { Coins, Settings, LogOut, Info, HelpCircle } from "lucide-react";
import { useUserTokens } from "@/hooks/useUserTokens";
import { Footer } from "@/components/Footer";
import logo from "@/assets/logo.png";
import { MobileMenu } from "@/components/MobileMenu";
import { NotificationBell } from "@/components/notifications";
import { brand } from '@/config/brand';
import { supabase } from "@/integrations/supabase/client";
import { StudioDropdown, LibraryDropdown, NavDropdownProvider } from "@/components/navigation";
import { GlobalMobileNav } from "@/components/navigation/mobile";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const dashboardLogger = logger.child({ component: 'DashboardLayout' });

/**
 * DashboardLayout - Layout component for authenticated dashboard pages.
 * Auth protection is handled by ProtectedRoute wrapper in App.tsx.
 */
export const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: tokenData } = useUserTokens();

  // Hide global mobile nav on Music Studio (it has its own nav)
  const isMusicStudio = location.pathname.includes('/music-studio');

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Signed out successfully");
      navigate("/");
    } catch (error) {
      dashboardLogger.error('Sign out failed', error as Error, {
        operation: 'handleLogout'
      });
      toast.error("Error signing out. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header */}
      <header className="border-b-4 border-black bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between gap-2">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0">
            <img 
              src={logo} 
              alt={`${brand.name} logo`}
              className="h-6 md:h-8 object-contain"
              />
              <span className="font-black text-lg md:text-xl text-foreground">{brand.name}</span>
            </Link>

            {/* Desktop Navigation - Dropdowns */}
            <NavDropdownProvider>
              <nav className="hidden md:flex items-center gap-3">
                <StudioDropdown align="center" />
                <LibraryDropdown align="start" />
              </nav>
            </NavDropdownProvider>

            <div className="flex items-center gap-1.5 md:gap-3 flex-shrink-0">
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="brutal-card-sm px-2 md:px-4 py-1.5 md:py-2 bg-primary-500 text-neutral-900 border-2 border-primary-600 cursor-pointer hover:bg-primary-600 transition-colors">
                    <div className="flex items-center gap-1 md:gap-2">
                      <Coins className="h-3.5 w-3.5 md:h-5 md:w-5" />
                      <span className="font-black text-xs md:text-base whitespace-nowrap">{Number(tokenData?.tokens_remaining || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">Credits Balance</p>
                      <p className="text-xs text-muted-foreground">
                        You have <span className="font-bold text-primary">{Number(tokenData?.tokens_remaining || 0).toFixed(2)}</span> credits remaining
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard/settings?tab=billing" className="flex items-center cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/pricing" className="flex items-center cursor-pointer">
                      <Coins className="mr-2 h-4 w-4" />
                      <span>Pricing</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/about" className="flex items-center cursor-pointer">
                      <Info className="mr-2 h-4 w-4" />
                      <span>About</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/faq" className="flex items-center cursor-pointer">
                      <HelpCircle className="mr-2 h-4 w-4" />
                      <span>FAQ</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile Menu */}
              <MobileMenu creditBalance={tokenData?.tokens_remaining} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-16 md:pb-0">
        <Outlet />
      </main>

      {/* Global Mobile Navigation - Hidden on Music Studio (has its own nav) */}
      {!isMusicStudio && <GlobalMobileNav />}

      {/* Footer - Add spacing on Music Studio so it isn't covered by the fixed player */}
      <div className={isMusicStudio ? 'pb-20' : ''}>
        <Footer />
      </div>
    </div>
  );
};
