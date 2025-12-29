import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Coins, History, Video, Settings, LogOut, Shield, BookOpen, ChevronDown } from "lucide-react";
import { useUserTokens } from "@/hooks/useUserTokens";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Footer } from "@/components/Footer";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";
import { MobileMenu } from "@/components/MobileMenu";
import { NotificationBell } from "@/components/notifications";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * DashboardLayout - Layout component for authenticated dashboard pages.
 * Auth protection is handled by ProtectedRoute wrapper in App.tsx.
 */
export const DashboardLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: tokenData } = useUserTokens();
  const { isFeatureEnabled, isFeatureComingSoon } = useFeatureFlags();
  const { isAdmin } = useAdminRole();

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
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
              alt="artifio.ai  logo" 
              className="h-6 md:h-8 object-contain"
              />
              <span className="font-black text-lg md:text-xl text-foreground">artifio.ai</span>
            </Link>

            {/* Desktop Navigation - Dropdowns */}
            <nav className="hidden md:flex items-center gap-2">
              {/* CREATE Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "text-base px-5 py-2.5 rounded-full font-semibold gap-1.5",
                      ["/dashboard/custom-creation", "/dashboard/templates", "/dashboard/video-studio", "/dashboard/storyboard"].some(p => isActive(p))
                        ? "bg-primary-500 !text-black hover:bg-primary-600 hover:!text-black border-2 border-primary-600 [&>svg]:!text-black [&>span]:!text-black"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Create</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 bg-background z-50">
                  {isFeatureEnabled('custom_creation') || isAdmin ? (
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard/custom-creation" className={cn("flex items-center cursor-pointer", isActive("/dashboard/custom-creation") && "bg-muted")}>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Custom
                        {isAdmin && (!isFeatureEnabled('custom_creation') || isFeatureComingSoon('custom_creation')) && <Shield className="h-3.5 w-3.5 ml-auto text-muted-foreground" />}
                      </Link>
                    </DropdownMenuItem>
                  ) : null}
                  {isFeatureEnabled('templates') || isAdmin ? (
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard/templates" className={cn("flex items-center cursor-pointer", isActive("/dashboard/templates") && "bg-muted")}>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Templates
                        {isAdmin && (!isFeatureEnabled('templates') || isFeatureComingSoon('templates')) && <Shield className="h-3.5 w-3.5 ml-auto text-muted-foreground" />}
                      </Link>
                    </DropdownMenuItem>
                  ) : null}
                  {isFeatureEnabled('faceless_videos') || isAdmin ? (
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard/video-studio" className={cn("flex items-center cursor-pointer", isActive("/dashboard/video-studio") && "bg-muted")}>
                        <Video className="mr-2 h-4 w-4" />
                        Videos
                        {isAdmin && (!isFeatureEnabled('faceless_videos') || isFeatureComingSoon('faceless_videos')) && <Shield className="h-3.5 w-3.5 ml-auto text-muted-foreground" />}
                      </Link>
                    </DropdownMenuItem>
                  ) : null}
                  {isFeatureEnabled('storyboard') || isAdmin ? (
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard/storyboard" className={cn("flex items-center cursor-pointer", isActive("/dashboard/storyboard") && "bg-muted")}>
                        <span className="mr-2">🎬</span>
                        Storyboard
                        {isAdmin && (!isFeatureEnabled('storyboard') || isFeatureComingSoon('storyboard')) && <Shield className="h-3.5 w-3.5 ml-auto text-muted-foreground" />}
                      </Link>
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* LIBRARY Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "text-base px-5 py-2.5 rounded-full font-semibold gap-1.5",
                      ["/dashboard/history", "/dashboard/prompts"].some(p => isActive(p))
                        ? "bg-primary-500 !text-black hover:bg-primary-600 hover:!text-black border-2 border-primary-600 [&>svg]:!text-black [&>span]:!text-black"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    <History className="h-4 w-4" />
                    <span>Library</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 bg-background z-50">
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard/history" className={cn("flex items-center cursor-pointer", isActive("/dashboard/history") && "bg-muted")}>
                      <History className="mr-2 h-4 w-4" />
                      Creations
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard/prompts" className={cn("flex items-center cursor-pointer", isActive("/dashboard/prompts") && "bg-muted")}>
                      <BookOpen className="mr-2 h-4 w-4" />
                      Prompts
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>

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
