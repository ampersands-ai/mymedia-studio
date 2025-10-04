import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

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

  useEffect(() => {
    // Redirect /playground to /dashboard/create
    if (window.location.pathname === "/playground") {
      navigate("/dashboard/create", { replace: true });
    }
  }, [navigate]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-primary border-3 border-black brutal-shadow flex items-center justify-center mx-auto animate-pulse">
            <Coins className="h-6 w-6 text-white" />
          </div>
          <p className="text-lg font-bold">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b px-4 bg-card">
            <SidebarTrigger className="mr-4" />
            
            <div className="ml-auto">
              <div className="brutal-card-sm px-4 py-2 bg-neon-yellow">
                <div className="flex items-center gap-2">
                  <Coins className="h-5 w-5" />
                  <span className="font-black">{tokensRemaining} tokens</span>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
