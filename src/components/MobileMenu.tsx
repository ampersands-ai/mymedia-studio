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
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Menu, Home, Wand2, Settings, LogOut, Coins, Shield,
  Sparkles, Layout, DollarSign, Info, BookOpen, HelpCircle, Users
} from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MobileMenuProps {
  tokenBalance?: number;
}

export const MobileMenu = ({ tokenBalance }: MobileMenuProps) => {
  const { user } = useAuth();
  const { isAdmin } = useAdminRole();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

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
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] sm:w-[320px] flex flex-col p-0 pb-safe">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle className="text-left font-black text-xl">Menu</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="flex flex-col gap-4 py-4">
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

              {/* Product Section */}
              <div className="text-xs font-bold text-muted-foreground mt-4 mb-2 px-2">PRODUCT</div>
              
              <Button
                variant={isActive("/features") ? "default" : "ghost"}
                className="justify-start h-12 text-base"
                onClick={() => handleNavigation("/features")}
              >
                <Sparkles className="h-5 w-5 mr-3" />
                Features
              </Button>

              <Button
                variant={isActive("/templates") ? "default" : "ghost"}
                className="justify-start h-12 text-base"
                onClick={() => handleNavigation("/templates")}
              >
                <Layout className="h-5 w-5 mr-3" />
                Templates
              </Button>

              <Button
                variant={isActive("/pricing") ? "default" : "ghost"}
                className="justify-start h-12 text-base"
                onClick={() => handleNavigation("/pricing")}
              >
                <DollarSign className="h-5 w-5 mr-3" />
                Pricing
              </Button>

              {/* Resources Section */}
              <div className="text-xs font-bold text-muted-foreground mt-4 mb-2 px-2">RESOURCES</div>
              
              <Button
                variant={isActive("/about") ? "default" : "ghost"}
                className="justify-start h-12 text-base"
                onClick={() => handleNavigation("/about")}
              >
                <Info className="h-5 w-5 mr-3" />
                About
              </Button>

              <Button
                variant={isActive("/blog") ? "default" : "ghost"}
                className="justify-start h-12 text-base"
                onClick={() => handleNavigation("/blog")}
              >
                <BookOpen className="h-5 w-5 mr-3" />
                Blog
              </Button>

              <Button
                variant={isActive("/faq") ? "default" : "ghost"}
                className="justify-start h-12 text-base"
                onClick={() => handleNavigation("/faq")}
              >
                <HelpCircle className="h-5 w-5 mr-3" />
                FAQ
              </Button>

              <Button
                variant={isActive("/community") ? "default" : "ghost"}
                className="justify-start h-12 text-base"
                onClick={() => handleNavigation("/community")}
              >
                <Users className="h-5 w-5 mr-3" />
                Community
              </Button>

              {/* Account Section */}
              <div className="text-xs font-bold text-muted-foreground mt-4 mb-2 px-2">ACCOUNT</div>
              
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
          </div>
        </ScrollArea>

        {/* Sign Out - Fixed at bottom */}
        {user && (
          <div className="p-6 pt-4 border-t mt-auto">
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
      </SheetContent>
    </Sheet>
  );
};
