import { useState } from "react";
import { Outlet, Link, useLocation, Navigate } from "react-router-dom";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Sparkles, Database, FileText, Users, BarChart3, Loader2, Image, Flag, TrendingUp, AlertTriangle, Video, FolderTree, Activity, LayoutDashboard, TestTube2, Mail, PenSquare, Layers, DollarSign, ToggleLeft, Shield, ShieldAlert, Menu } from "lucide-react";
import { AdminAlertBell } from "@/components/admin/AdminAlertBell";
import { cn } from "@/lib/utils";
import { Footer } from "@/components/Footer";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const navItems = [
  { path: "/dashboard/custom-creation", label: "User Dashboard", icon: LayoutDashboard },
  { path: "/admin/dashboard", label: "Overview", icon: BarChart3 },
  { path: "/admin/moderation", label: "Moderation", icon: ShieldAlert },
  { path: "/admin/analytics", label: "Analytics", icon: TrendingUp },
  { path: "/admin/advanced-analytics", label: "Advanced Analytics", icon: BarChart3 },
  { path: "/admin/blog/create", label: "Create Blog", icon: PenSquare },
  { path: "/admin/models", label: "AI Models", icon: Database },
  { path: "/admin/model-pricing", label: "Model Pricing", icon: DollarSign },
  { path: "/admin/feature-settings", label: "Feature Settings", icon: ToggleLeft },
  { path: "/admin/templates", label: "Templates", icon: FileText },
  { path: "/admin/users", label: "Users", icon: Users },
  { path: "/admin/generations", label: "All Generations", icon: Image },
  { path: "/admin/disputes", label: "Token Disputes", icon: Flag },
  { path: "/admin/threshold-breach", label: "Threshold Breach", icon: AlertTriangle },
  { path: "/admin/test-model-group", label: "Test Model Group", icon: TestTube2 },
  { path: "/admin/comprehensive-model-tester", label: "Model Tester", icon: Layers },
  { path: "/admin/webhook-monitor", label: "Webhook Monitor", icon: Activity },
  { path: "/admin/security", label: "Security", icon: Shield },
  { path: "/admin/user-logs", label: "User Logs", icon: Activity },
  { path: "/admin/email-settings", label: "Email Settings", icon: Mail },
  { path: "/admin/video-jobs", label: "Video Jobs", icon: Video },
  { path: "/admin/template-landing", label: "Landing Pages", icon: FileText },
  { path: "/admin/template-categories", label: "Categories", icon: FolderTree },
  { path: "/admin/template-analytics", label: "Template Analytics", icon: BarChart3 },
  { path: "/admin/cinematic-prompts", label: "Cinematic Prompts", icon: Sparkles },
];

/**
 * AdminLayout - Layout component for admin pages.
 * Auth protection is handled by ProtectedRoute wrapper in App.tsx.
 * This component only checks for admin role access.
 */
export const AdminLayout = () => {
  const location = useLocation();
  const { isAdmin, loading: roleLoading } = useAdminRole();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Show loading spinner while checking admin role
  if (roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect non-admins to dashboard
  if (!isAdmin) {
    return <Navigate to="/dashboard/custom-creation" replace />;
  }

  const NavLinks = ({ onItemClick }: { onItemClick?: () => void }) => (
    <nav className="p-4 space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={onItemClick}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-colors text-sm",
              isActive
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            )}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  // Render admin layout
  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <h1 className="text-lg font-black">ADMIN</h1>
        <div className="flex items-center gap-2">
          <AdminAlertBell />
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <div className="p-4 border-b">
              <h2 className="text-lg font-black">ADMIN PANEL</h2>
            </div>
            <ScrollArea className="h-[calc(100vh-65px)]">
              <NavLinks onItemClick={() => setMobileMenuOpen(false)} />
            </ScrollArea>
          </SheetContent>
        </Sheet>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar - hidden on mobile */}
        <aside className="hidden md:block w-64 min-h-screen bg-card border-r-3 border-black brutal-shadow sticky top-0 h-screen overflow-hidden">
          <div className="p-6 border-b-3 border-black flex items-center justify-between">
            <h1 className="text-xl font-black">ADMIN PANEL</h1>
            <AdminAlertBell />
          </div>
          <ScrollArea className="h-[calc(100vh-80px)]">
            <NavLinks />
          </ScrollArea>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 min-w-0">
          <Outlet />
        </main>
      </div>
      
      <Footer />
    </div>
  );
};
