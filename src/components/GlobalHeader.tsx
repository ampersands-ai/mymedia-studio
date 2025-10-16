import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Settings, Coins, LogOut, Shield, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useUserTokens } from "@/hooks/useUserTokens";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import textLogo from "@/assets/text-logo.png";
import { MobileMenu } from "@/components/MobileMenu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export const GlobalHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { isAdmin } = useAdminRole();
  const { data: tokenData } = useUserTokens();
  const tokenBalance = tokenData?.tokens_remaining ?? null;

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/");
      toast.success("Signed out successfully");
    } catch (error) {
      toast.error("Error signing out");
      console.error("Sign out error:", error);
    }
  };

  const getTokenConversions = (balance: number) => {
    return {
      videos: Math.floor(balance / 100),
      images: Math.floor(balance / 25),
      audio: Math.floor(balance / 50),
    };
  };

  const isDashboardCreate = location.pathname === "/dashboard/create";
  const isCustomCreation = location.pathname === "/dashboard/custom-creation";
  const isSettingsPage = location.pathname === "/dashboard/settings";

  return (
    <header className="border-b-4 border-black bg-card sticky top-0 z-50">
      <nav className="container mx-auto px-4 py-4 md:py-6">
        <div className="flex items-center justify-between">
          {/* Mobile Menu */}
          <div className="md:hidden">
            <MobileMenu tokenBalance={tokenBalance ?? undefined} />
          </div>

          {/* Left Side - Logo + Navigation */}
          <div className="flex items-center gap-3 md:gap-4">
            <Link to="/" className="flex items-center gap-2 md:gap-3 hover:opacity-80 transition-opacity">
              <img 
                src={logo} 
                alt="artifio.ai logo" 
                className="h-10 w-10 md:h-12 md:w-12 rounded-xl border-3 border-black brutal-shadow"
                loading="eager"
              />
              <span className="text-2xl md:text-3xl font-bold text-black" style={{ fontFamily: 'Inter, sans-serif' }}>
                artifio.ai
              </span>
            </Link>

            {!isDashboardCreate && !isCustomCreation && !isSettingsPage && (
              <>
                <Button
                  variant="ghost"
                  size="default"
                  onClick={() => navigate("/pricing")}
                  className="hidden sm:inline-flex font-black text-base"
                >
                  Pricing
                </Button>
                <Button
                  variant="ghost"
                  size="default"
                  onClick={() => navigate("/community")}
                  className="hidden sm:inline-flex font-black text-base"
                >
                  Community
                </Button>
                <Button
                  variant="ghost"
                  size="default"
                  onClick={() => navigate("/dashboard/custom-creation")}
                  className="hidden sm:inline-flex font-black text-base"
                >
                  Dashboard
                </Button>
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => navigate("/dashboard/custom-creation")}
                  className="brutal-card-sm font-black hidden sm:flex"
                >
                  <Sparkles className="h-5 w-5 mr-2" />
                  Custom Creation
                </Button>
              </>
            )}
          </div>

          {/* Right Side - Desktop Only Navigation */}
          <div className="hidden md:flex items-center gap-2 md:gap-3">
            {/* Settings page navigation */}
            {isSettingsPage && (
              <>
                <Button
                  variant="ghost"
                  size="default"
                  onClick={() => navigate("/pricing")}
                  className="hidden sm:inline-flex font-black text-base"
                >
                  Pricing
                </Button>
                <Button
                  variant="ghost"
                  size="default"
                  onClick={() => navigate("/dashboard/custom-creation")}
                  className="hidden sm:inline-flex font-black text-base"
                >
                  Dashboard
                </Button>
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => navigate("/dashboard/custom-creation")}
                  className="brutal-card-sm font-black hidden sm:flex"
                >
                  <Sparkles className="h-5 w-5 mr-2" />
                  Custom Creation
                </Button>
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => navigate("/dashboard/settings")}
                  className="brutal-card-sm font-black hidden sm:flex"
                >
                  <Settings className="h-5 w-5 mr-2" />
                  Settings
                </Button>
              </>
            )}

            {/* Context-aware navigation buttons */}
            {isDashboardCreate && (
              <>
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => navigate("/dashboard/custom-creation")}
                  className="brutal-card-sm font-black hidden sm:flex"
                >
                  <Sparkles className="h-5 w-5 mr-2" />
                  Custom Creation
                </Button>
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => navigate("/dashboard/settings")}
                  className="brutal-card-sm font-black hidden sm:flex"
                >
                  <Settings className="h-5 w-5 mr-2" />
                  Settings
                </Button>
              </>
            )}

            {isCustomCreation && (
              <>
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => navigate("/dashboard/custom-creation")}
                  className="brutal-card-sm font-black hidden sm:flex"
                >
                  Dashboard
                </Button>
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => navigate("/dashboard/settings")}
                  className="brutal-card-sm font-black hidden sm:flex"
                >
                  <Settings className="h-5 w-5 mr-2" />
                  Settings
                </Button>
              </>
            )}

            {tokenBalance !== null && (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="brutal-card-sm px-4 py-2 bg-primary-500 border-2 border-primary-600 flex items-center gap-2 hover:bg-primary-600 transition-colors cursor-pointer">
                    <Coins className="h-5 w-5 text-neutral-900" />
                    <span className="font-black text-base text-neutral-900">
                      {tokenBalance.toLocaleString()}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent 
                  className="w-80 bg-white border-2 border-secondary-600 shadow-lg p-4 animate-in fade-in-0 zoom-in-95 duration-200"
                  align="end"
                  sideOffset={8}
                >
                  <div className="space-y-4">
                    {/* Token Balance Header */}
                    <div className="border-b-2 border-neutral-200 pb-3">
                      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                        Token Balance
                      </p>
                      <p className="text-3xl font-black text-neutral-900 mt-1">
                        {tokenBalance.toLocaleString()}
                      </p>
                    </div>

                    {/* Conversion Estimates */}
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                        Approximate Creations
                      </p>
                      <div className="space-y-2">
                        {(() => {
                          const conversions = getTokenConversions(tokenBalance);
                          return (
                            <>
                              <div className="flex items-center justify-between py-2 px-3 bg-neutral-50 rounded-lg border border-neutral-200">
                                <span className="text-sm font-semibold text-neutral-700">
                                  Videos
                                </span>
                                <span className="text-base font-black text-secondary-700">
                                  ~{conversions.videos}
                                </span>
                              </div>
                              <div className="flex items-center justify-between py-2 px-3 bg-neutral-50 rounded-lg border border-neutral-200">
                                <span className="text-sm font-semibold text-neutral-700">
                                  Images
                                </span>
                                <span className="text-base font-black text-secondary-700">
                                  ~{conversions.images}
                                </span>
                              </div>
                              <div className="flex items-center justify-between py-2 px-3 bg-neutral-50 rounded-lg border border-neutral-200">
                                <span className="text-sm font-semibold text-neutral-700">
                                  Audio
                                </span>
                                <span className="text-base font-black text-secondary-700">
                                  ~{conversions.audio}
                                </span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Usage History Link */}
                    <div className="pt-2 border-t-2 border-neutral-200">
                      <Link 
                        to="/dashboard/settings" 
                        state={{ defaultTab: 'history' }}
                        className="flex items-center justify-center gap-2 py-2 px-4 bg-secondary-600 hover:bg-secondary-700 text-white font-bold text-sm rounded-lg transition-colors duration-200"
                      >
                        <Clock className="h-4 w-4" />
                        View Usage History
                      </Link>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {isAdmin && (
              <Button
                variant="outline"
                size="default"
                onClick={() => navigate("/admin/dashboard")}
                className="brutal-card-sm font-black"
              >
                <Shield className="h-5 w-5 mr-2" />
                Admin
              </Button>
            )}

            <Button
              variant="outline"
              size="default"
              onClick={handleSignOut}
              className="brutal-card-sm font-black"
            >
              <LogOut className="h-5 w-5 mr-2" />
              Logout
            </Button>
          </div>

          {/* Mobile - Token Balance Only */}
          {tokenBalance !== null && (
            <div className="md:hidden brutal-card-sm px-3 py-1.5 bg-primary-500 border-2 border-primary-600 flex items-center gap-1.5 whitespace-nowrap">
              <Coins className="h-4 w-4 text-neutral-900 flex-shrink-0" />
              <span className="font-black text-sm text-neutral-900 tabular-nums">{tokenBalance.toLocaleString()}</span>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
};
