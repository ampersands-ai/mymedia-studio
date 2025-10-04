import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Sparkles } from "lucide-react";

export const DashboardLayout = () => {
  const navigate = useNavigate();
  const { user, session, loading } = useAuth();

  useEffect(() => {
    if (!loading && !session) {
      navigate("/auth");
      return;
    }
  }, [user, session, loading, navigate]);

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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};
