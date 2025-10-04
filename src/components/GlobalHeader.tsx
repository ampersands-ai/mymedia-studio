import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Settings, Coins, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import textLogo from "@/assets/text-logo.png";

export const GlobalHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      fetchTokenBalance();
    }
  }, [user]);

  const fetchTokenBalance = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("user_subscriptions")
        .select("tokens_remaining")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching token balance:", error);
        toast.error("Failed to load token balance");
        setTokenBalance(0);
        return;
      }
      
      if (!data) {
        console.warn("No subscription data found for user");
        setTokenBalance(0);
        return;
      }
      
      setTokenBalance(data.tokens_remaining ?? 0);
    } catch (error) {
      console.error("Error fetching token balance:", error);
      toast.error("An error occurred while fetching your balance");
      setTokenBalance(0);
    }
  };

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
          {/* Left Side - Logo + Navigation */}
          <div className="flex items-center gap-3 md:gap-4">
            <Link to="/" className="flex items-center gap-2 md:gap-3 hover:opacity-80 transition-opacity">
              <img 
                src={logo} 
                alt="Artifio.ai logo" 
                className="h-10 w-10 md:h-12 md:w-12 rounded-xl border-3 border-black brutal-shadow"
              />
              <img 
                src={textLogo} 
                alt="Artifio" 
                className="h-8 md:h-10"
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

          {/* Right Side - Settings (dashboard only), Token Balance, Logout */}
          <div className="flex items-center gap-2 md:gap-3">
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

            <Button
              variant="outline"
              size="default"
              onClick={handleSignOut}
              className="brutal-card-sm font-black"
            >
              <LogOut className="h-5 w-5 sm:mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </nav>
    </header>
  );
};
