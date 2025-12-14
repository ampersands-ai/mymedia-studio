import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Coins, History, Video, Settings, LogOut, Clock } from "lucide-react";
import { useUserTokens } from "@/hooks/useUserTokens";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { Footer } from "@/components/Footer";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";
import { MobileMenu } from "@/components/MobileMenu";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * DashboardLayout - Layout component for authenticated dashboard pages.
 * Auth protection is handled by ProtectedRoute wrapper in App.tsx.
 */
export const DashboardLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: tokenData } = useUserTokens();
  const { isFeatureEnabled, isFeatureComingSoon } = useFeatureFlags();

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const renderNavButton = (
    path: string,
    label: string,
    icon: React.ReactNode,
    featureId: 'templates' | 'custom_creation' | 'faceless_videos' | 'storyboard'
  ) => {
    const enabled = isFeatureEnabled(featureId);
    const comingSoon = isFeatureComingSoon(featureId);

    if (!enabled) return null;

    if (comingSoon) {
      return (
        <TooltipProvider key={path}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                disabled
                className="text-base px-6 py-5 rounded-full opacity-50 cursor-not-allowed"
              >
                {icon}
                <span className="mr-1">{label}</span>
                <Clock className="h-3.5 w-3.5 ml-1 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Coming soon</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <Link to={path} key={path}>
        <Button
          variant={isActive(path) ? "default" : "ghost"}
          className={cn(
            "text-base px-6 py-5 rounded-full",
            isActive(path) 
              ? "bg-primary-500 text-neutral-900 font-semibold border-2 border-primary-600 hover:bg-primary-600" 
              : "text-foreground hover:bg-muted hover:text-foreground font-medium"
          )}
        >
          {icon}
          {label}
        </Button>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b-4 border-black bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between gap-2">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0">
            <img 
              src={logo} 
              alt="artifio.ai  logo" 
              className="h-6 md:h-8 object-contain"
              />
              <span className="font-black text-lg md:text-xl text-foreground">artifio.ai</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-2">
              {renderNavButton(
                "/dashboard/templates",
                "Templates",
                <Sparkles className="h-5 w-5 mr-2" />,
                "templates"
              )}
              {renderNavButton(
                "/dashboard/custom-creation",
                "Custom Creation",
                <Sparkles className="h-5 w-5 mr-2" />,
                "custom_creation"
              )}
              <Link to="/dashboard/history">
                <Button
                  variant={isActive("/dashboard/history") ? "default" : "ghost"}
                  className={cn(
                    "text-base px-6 py-5 rounded-full",
                    isActive("/dashboard/history") 
                      ? "bg-primary-500 text-neutral-900 font-semibold border-2 border-primary-600 hover:bg-primary-600" 
                      : "text-foreground hover:bg-muted hover:text-foreground font-medium"
                  )}
                >
                  <History className="h-5 w-5 mr-2" />
                  My Creations
                </Button>
              </Link>
              {renderNavButton(
                "/dashboard/video-studio",
                "Faceless Videos",
                <Video className="h-5 w-5 mr-2" />,
                "faceless_videos"
              )}
              {renderNavButton(
                "/dashboard/storyboard",
                "Storyboard",
                <span className="mr-2">🎬</span>,
                "storyboard"
              )}
            </nav>

            <div className="flex items-center gap-1.5 md:gap-3 flex-shrink-0">
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
      <main className="flex-1">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
};
