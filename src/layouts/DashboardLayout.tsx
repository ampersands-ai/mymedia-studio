import { useEffect, useState } from "react";
import { Outlet, useNavigate, NavLink, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Coins, Sparkles, History, Settings, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";
import textLogo from "@/assets/text-logo.png";

export const DashboardLayout = () => {
  const navigate = useNavigate();
  const { user, session, loading } = useAuth();
  const [tokensRemaining, setTokensRemaining] = useState(0);

  useEffect(() => {
    if (!loading && !session) {
      navigate("/auth");
      return;
    }
    if (user) {
      fetchTokenBalance(user.id);
    }
  }, [user, session, loading, navigate]);

  const fetchTokenBalance = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_subscriptions")
      .select("tokens_remaining")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Error fetching tokens:", error);
      return;
    }
    setTokensRemaining(data?.tokens_remaining || 0);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-primary border-3 border-black brutal-shadow flex items-center justify-center mx-auto animate-pulse">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <p className="text-lg font-bold">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col w-full bg-background">
      <header className="border-b-4 border-black bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img 
              src={logo} 
              alt="Artifio.ai logo symbol" 
              className="h-10 w-10 rounded-xl border-3 border-black brutal-shadow"
            />
            <img 
              src={textLogo} 
              alt="Artifio" 
              className="h-8"
            />
          </Link>

          <div className="flex items-center gap-4">
            <NavLink
              to="/dashboard/create"
              className={({ isActive }) =>
                `brutal-card-sm px-4 py-2 transition-colors ${
                  isActive ? "bg-neon-pink text-white border-black" : "bg-card text-foreground hover:bg-muted border-black"
                }`
              }
            >
              {({ isActive }) => (
                <div className="flex items-center gap-2">
                  <Sparkles className={`h-5 w-5 ${isActive ? 'text-white' : 'text-foreground'}`} />
                  <span className={`font-black ${isActive ? 'text-white' : 'text-foreground'}`}>Start Custom Creation</span>
                </div>
              )}
            </NavLink>
            <NavLink
              to="/dashboard/settings"
              className={({ isActive }) =>
                `brutal-card-sm px-4 py-2 transition-colors ${
                  isActive ? "bg-primary text-white border-black" : "bg-card text-foreground hover:bg-muted border-black"
                }`
              }
            >
              {({ isActive }) => (
                <div className="flex items-center gap-2">
                  <Settings className={`h-5 w-5 ${isActive ? 'text-white' : 'text-foreground'}`} />
                  <span className={`font-black ${isActive ? 'text-white' : 'text-foreground'}`}>Settings</span>
                </div>
              )}
            </NavLink>
            <div className="brutal-card-sm px-4 py-2 bg-neon-yellow">
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5" />
                <span className="font-black">{tokensRemaining} tokens</span>
              </div>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleSignOut}
              title="Sign Out"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};
