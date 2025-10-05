import { useEffect } from "react";
import { Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Sparkles, Database, FileText, Users, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

export const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, loading } = useAdminRole();

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/dashboard/create");
    }
  }, [isAdmin, loading, navigate]);

  // Redirect non-admins without showing loading state
  if (!loading && !isAdmin) {
    navigate("/dashboard/create");
    return null;
  }

  // Render immediately, no loading state
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
              { path: "/admin/dashboard", label: "Overview", icon: BarChart3 },
              { path: "/admin/models", label: "AI Models", icon: Database },
              { path: "/admin/templates", label: "Templates", icon: FileText },
              { path: "/admin/users", label: "Users", icon: Users },
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
    </div>
  );
};
