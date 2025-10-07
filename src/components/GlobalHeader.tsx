import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Settings, Coins, LogOut, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useUserTokens } from "@/hooks/useUserTokens";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import textLogo from "@/assets/text-logo.png";
import { MobileMenu } from "@/components/MobileMenu";

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
                alt="Artifio.ai logo" 
                className="h-10 w-10 md:h-12 md:w-12 rounded-xl border-3 border-black brutal-shadow"
                loading="eager"
              />
              <img 
                src={textLogo} 
                alt="Artifio" 
                className="h-8 md:h-10"
                loading="eager"
              />
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
                  onClick={() => navigate("/dashboard/create")}
                  className="hidden sm:inline-flex font-black text-base"
                >
                  Dashboard
                </Button>
                <Button
                  variant="ghost"
                  size="default"
                  onClick={() => navigate("/video-test")}
                  className="hidden sm:inline-flex font-black text-base"
                >
                  Video Test
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
                  onClick={() => navigate("/dashboard/create")}
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
                  onClick={() => navigate("/dashboard/create")}
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
              <div className="brutal-card-sm px-4 py-2 bg-neon-yellow flex items-center gap-2">
                <Coins className="h-5 w-5" />
                <span className="font-black text-base">{tokenBalance.toLocaleString()}</span>
              </div>
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
            <div className="md:hidden brutal-card-sm px-3 py-1.5 bg-neon-yellow flex items-center gap-1.5">
              <Coins className="h-4 w-4" />
              <span className="font-black text-sm">{tokenBalance.toLocaleString()}</span>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
};
