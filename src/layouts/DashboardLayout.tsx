import { useEffect, useState } from "react";
import { Outlet, useNavigate, NavLink, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Coins, Sparkles, History, Settings, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

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
            <div className="h-10 w-10 rounded-xl bg-gradient-primary border-3 border-black brutal-shadow flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-black gradient-text">ARTIFIO.AI</h1>
          </Link>

          <nav className="flex items-center gap-6">
            <NavLink
              to="/dashboard/create"
              className={({ isActive }) =>
                `flex items-center gap-2 font-bold transition-colors ${
                  isActive ? "text-primary" : "text-foreground/70 hover:text-foreground"
                }`
              }
            >
              <Sparkles className="h-5 w-5" />
              Start Creating
            </NavLink>
            <NavLink
              to="/dashboard/history"
              className={({ isActive }) =>
                `flex items-center gap-2 font-bold transition-colors ${
                  isActive ? "text-primary" : "text-foreground/70 hover:text-foreground"
                }`
              }
            >
              <History className="h-5 w-5" />
              History
            </NavLink>
            <NavLink
              to="/dashboard/settings"
              className={({ isActive }) =>
                `flex items-center gap-2 font-bold transition-colors ${
                  isActive ? "text-primary" : "text-foreground/70 hover:text-foreground"
                }`
              }
            >
              <Settings className="h-5 w-5" />
              Settings
            </NavLink>
          </nav>

          <div className="flex items-center gap-4">
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
