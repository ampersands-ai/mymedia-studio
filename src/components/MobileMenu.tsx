import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu, Home, Wand2, Settings, LogOut, Coins, Shield } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

interface MobileMenuProps {
  tokenBalance?: number;
}

export const MobileMenu = ({ tokenBalance }: MobileMenuProps) => {
  const { user } = useAuth();
  const { isAdmin } = useAdminRole();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  // Only render on mobile devices for better performance
  if (!isMobile) return null;

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setOpen(false);
      navigate("/");
      toast.success("Signed out successfully");
    } catch (error) {
      toast.error("Error signing out");
      console.error("Sign out error:", error);
    }
  };

  const handleNavigation = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] sm:w-[320px]">
        <SheetHeader>
          <SheetTitle className="text-left font-black text-xl">Menu</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-4 mt-8">
          {/* Token Balance */}
          {tokenBalance !== undefined && (
            <div className="p-4 bg-primary/10 rounded-lg border-2 border-primary/20">
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-primary" />
                <div>
                  <div className="text-xs text-muted-foreground">Token Balance</div>
                  <div className="text-xl font-black text-primary">{tokenBalance.toLocaleString()}</div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="flex flex-col gap-2">
            <Button
              variant={isActive("/") ? "default" : "ghost"}
              className="justify-start h-12 text-base"
              onClick={() => handleNavigation("/")}
            >
              <Home className="h-5 w-5 mr-3" />
              Home
            </Button>

            <Button
              variant={isActive("/dashboard/create") ? "default" : "ghost"}
              className="justify-start h-12 text-base"
              onClick={() => handleNavigation("/dashboard/create")}
            >
              <Wand2 className="h-5 w-5 mr-3" />
              Create
            </Button>

            <Button
              variant={isActive("/dashboard/settings") ? "default" : "ghost"}
              className="justify-start h-12 text-base"
              onClick={() => handleNavigation("/dashboard/settings")}
            >
              <Settings className="h-5 w-5 mr-3" />
              Settings
            </Button>

            {isAdmin && (
              <Button
                variant={isActive("/admin/dashboard") ? "default" : "ghost"}
                className="justify-start h-12 text-base"
                onClick={() => handleNavigation("/admin/dashboard")}
              >
                <Shield className="h-5 w-5 mr-3" />
                Admin Panel
              </Button>
            )}
          </nav>

          {/* Sign Out */}
          {user && (
            <div className="mt-auto pt-4 border-t">
              <Button
                variant="outline"
                className="w-full justify-start h-12 text-base"
                onClick={handleSignOut}
              >
                <LogOut className="h-5 w-5 mr-3" />
                Sign Out
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
