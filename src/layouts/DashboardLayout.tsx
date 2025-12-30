import { Link, Outlet, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Coins, History, Video, Settings, LogOut, ChevronDown, Clapperboard, Info, HelpCircle, LayoutTemplate, Film, MessageSquare } from "lucide-react";
import { useUserTokens } from "@/hooks/useUserTokens";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Footer } from "@/components/Footer";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";
import { MobileMenu } from "@/components/MobileMenu";
import { NotificationBell } from "@/components/notifications";
import { supabase } from "@/integrations/supabase/client";
import { CREATION_GROUPS } from "@/constants/creation-groups";
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
  const navigate = useNavigate();
  const { data: tokenData } = useUserTokens();
  const { isFeatureEnabled } = useFeatureFlags();
  const { isAdmin } = useAdminRole();

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
            <nav className="hidden md:flex items-center gap-3">
              {/* STUDIO Dropdown - Grand Design */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    className="bg-gradient-to-r from-primary-yellow to-primary-orange text-neutral-900 font-bold text-base px-6 py-3 rounded-full shadow-lg shadow-primary-orange/40 hover:shadow-xl hover:shadow-primary-orange/50 hover:scale-105 transition-all duration-300 gap-2 border-2 border-primary-orange/50"
                  >
                    <Sparkles className="h-5 w-5" />
                    <span>Studio</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="start" 
                  className="w-[420px] p-5 bg-card/95 backdrop-blur-xl border-2 border-primary-orange/30 rounded-2xl shadow-2xl shadow-primary-orange/20 z-[100]"
                >
                  {/* Creation Groups Grid */}
                  <div className="mb-4">
                    <p className="text-xs font-bold text-primary-orange uppercase tracking-wider mb-3 px-1">Generate Content</p>
                    <div className="grid grid-cols-2 gap-2">
                      {CREATION_GROUPS.map((group) => {
                        const IconComponent = group.Icon;
                        return (
                          <Link
                            key={group.id}
                            to={`/dashboard/custom-creation?group=${group.id}`}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-xl bg-background/60 hover:bg-primary-orange/20 border border-transparent hover:border-primary-orange/40 transition-all duration-200 group",
                              group.id === "prompt_to_audio" && "col-span-2"
                            )}
                          >
                            <div className="p-2 rounded-lg bg-primary-orange/20 text-primary-orange group-hover:bg-primary-orange group-hover:text-neutral-900 transition-colors">
                              <IconComponent className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-foreground">{group.label}</p>
                              <p className="text-xs text-muted-foreground truncate">{group.subtitle}</p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  <DropdownMenuSeparator className="bg-border/50 my-3" />

                  {/* More Tools */}
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 px-1">More Tools</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(isFeatureEnabled('faceless_videos') || isAdmin) && (
                        <Link
                          to="/dashboard/video-studio"
                          className="flex items-center gap-3 p-3 rounded-xl bg-background/60 hover:bg-muted/80 border border-transparent hover:border-border transition-all duration-200"
                        >
                          <Video className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">Faceless Videos</span>
                        </Link>
                      )}
                      <Link
                        to="/video-editor"
                        className="flex items-center gap-3 p-3 rounded-xl bg-background/60 hover:bg-muted/80 border border-transparent hover:border-border transition-all duration-200"
                      >
                        <Clapperboard className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">Video Editor</span>
                      </Link>
                      {(isFeatureEnabled('storyboard') || isAdmin) && (
                        <Link
                          to="/dashboard/storyboard"
                          className="flex items-center gap-3 p-3 rounded-xl bg-background/60 hover:bg-muted/80 border border-transparent hover:border-border transition-all duration-200"
                        >
                          <Film className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">Storyboard</span>
                        </Link>
                      )}
                      {(isFeatureEnabled('templates') || isAdmin) && (
                        <Link
                          to="/dashboard/templates"
                          className="flex items-center gap-3 p-3 rounded-xl bg-background/60 hover:bg-muted/80 border border-transparent hover:border-border transition-all duration-200"
                        >
                          <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">Templates</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* LIBRARY Dropdown - Grand Design */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    className="bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold text-base px-6 py-3 rounded-full shadow-lg shadow-purple-500/40 hover:shadow-xl hover:shadow-purple-500/50 hover:scale-105 transition-all duration-300 gap-2 border-2 border-purple-400/50"
                  >
                    <History className="h-5 w-5" />
                    <span>Library</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="start" 
                  className="w-72 p-4 bg-card/95 backdrop-blur-xl border-2 border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-500/20 z-[100]"
                >
                  <Link
                    to="/dashboard/history"
                    className="flex items-center gap-4 p-4 rounded-xl bg-background/60 hover:bg-purple-500/20 border border-transparent hover:border-purple-500/40 transition-all duration-200 mb-2 group"
                  >
                    <div className="p-2.5 rounded-lg bg-purple-500/20 text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                      <History className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground">History</p>
                      <p className="text-sm text-muted-foreground">View your creations</p>
                    </div>
                  </Link>
                  <Link
                    to="/dashboard/prompts"
                    className="flex items-center gap-4 p-4 rounded-xl bg-background/60 hover:bg-purple-500/20 border border-transparent hover:border-purple-500/40 transition-all duration-200 group"
                  >
                    <div className="p-2.5 rounded-lg bg-purple-500/20 text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground">Prompts</p>
                      <p className="text-sm text-muted-foreground">Saved prompt library</p>
                    </div>
                  </Link>
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
      <main className="flex-1">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
};
