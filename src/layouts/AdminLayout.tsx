import { useEffect } from "react";
import { Outlet, useNavigate, Link, useLocation, Navigate } from "react-router-dom";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useAuth } from "@/contexts/AuthContext";
import { Sparkles, Database, FileText, Users, BarChart3, Loader2, Image, Flag, TrendingUp, AlertTriangle, Video, FolderTree, Activity, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { Footer } from "@/components/Footer";

export const AdminLayout = () => {
  const location = useLocation();
  const { loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useAdminRole();

  // Combined loading state
  const loading = authLoading || roleLoading;

  // Show loading spinner while checking
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Only redirect after all checks complete
  if (!isAdmin) {
    return <Navigate to="/dashboard/custom-creation" replace />;
  }

  // Render admin layout
  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-screen bg-card border-r-3 border-black brutal-shadow">
          <div className="p-6 border-b-3 border-black">
            <h1 className="text-2xl font-black">ADMIN PANEL</h1>
          </div>
          <nav className="p-4 space-y-2">
            {[
              { path: "/dashboard/custom-creation", label: "User Dashboard", icon: LayoutDashboard },
              { path: "/admin/dashboard", label: "Overview", icon: BarChart3 },
              { path: "/admin/analytics", label: "Analytics", icon: TrendingUp },
            { path: "/admin/models", label: "AI Models", icon: Database },
            { path: "/admin/templates", label: "Templates", icon: FileText },
            { path: "/admin/users", label: "Users", icon: Users },
              { path: "/admin/generations", label: "All Generations", icon: Image },
              { path: "/admin/disputes", label: "Token Disputes", icon: Flag },
              { path: "/admin/threshold-breach", label: "Threshold Breach", icon: AlertTriangle },
              { path: "/admin/webhook-monitor", label: "Webhook Monitor", icon: Activity },
              { path: "/admin/video-jobs", label: "Video Jobs", icon: Video },
            { path: "/admin/template-landing", label: "Landing Pages", icon: FileText },
              { path: "/admin/template-categories", label: "Categories", icon: FolderTree },
              { path: "/admin/template-analytics", label: "Template Analytics", icon: BarChart3 },
              { path: "/admin/cinematic-prompts", label: "Cinematic Prompts", icon: Sparkles },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
      
      <Footer />
    </div>
  );
};
