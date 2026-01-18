import { useLocation, useNavigate } from "react-router-dom";
import { Home, Sparkles, Music, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useUserProfile, getInitials } from "@/hooks/useUserProfile";

interface NavItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  route: string;
  isAvatar?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Home", icon: Home, route: "/dashboard/custom-creation" },
  { id: "create", label: "Create", icon: Sparkles, route: "/dashboard/custom-creation?group=prompt_to_image" },
  { id: "library", label: "Library", icon: Music, route: "/dashboard/history" },
  { id: "discover", label: "Discover", icon: Search, route: "/dashboard/templates" },
  { id: "profile", label: "Profile", route: "/dashboard/settings", isAvatar: true },
];

export function GlobalMobileNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: profile } = useUserProfile();

  const isActive = (item: NavItem) => {
    const currentPath = location.pathname;
    const itemPath = item.route.split("?")[0];
    
    // Special case for home/create which share base route
    if (item.id === "create" && currentPath === "/dashboard/custom-creation") {
      return location.search.includes("group=");
    }
    if (item.id === "home" && currentPath === "/dashboard/custom-creation") {
      return !location.search.includes("group=");
    }
    
    return currentPath === itemPath || currentPath.startsWith(itemPath + "/");
  };

  const handleNavigate = (route: string) => {
    navigate(route);
  };

  const initials = getInitials(profile?.display_name, profile?.email);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border z-50 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-around py-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);

          return (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.route)}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-1.5 rounded-lg transition-colors min-w-[56px]",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.isAvatar ? (
                <Avatar className={cn(
                  "h-5 w-5 border-2",
                  active ? "border-primary" : "border-transparent"
                )}>
                  <AvatarFallback className={cn(
                    "text-[8px] font-bold",
                    active 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted text-muted-foreground"
                  )}>
                    {initials}
                  </AvatarFallback>
                </Avatar>
              ) : Icon ? (
                <Icon className="h-5 w-5" />
              ) : null}
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
