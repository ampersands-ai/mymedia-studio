import { Link, useLocation } from "react-router-dom";
import { 
  Menu, 
  User, 
  Image, 
  Search, 
  Share2, 
  Volume2, 
  ShoppingCart,
  X,
  Film
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface MinimalSidebarProps {
  className?: string;
}

export const MinimalSidebar = ({ className }: MinimalSidebarProps) => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(true);

  const navItems = [
    { icon: User, label: "Profile", href: "/dashboard/settings" },
    { icon: Image, label: "Create", href: "/create-minimal" },
    { icon: Film, label: "Storyboard", href: "/storyboard-minimal" },
    { icon: Search, label: "Gallery", href: "/dashboard/templates" },
    { icon: Share2, label: "Share", href: "/community" },
    { icon: Volume2, label: "Audio", href: "/dashboard/video-studio" },
  ];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-50 p-3 rounded-xl backdrop-blur-xl bg-black/20 border border-white/10 hover:bg-black/30 transition-all"
      >
        <Menu className="w-6 h-6 text-white" />
      </button>
    );
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen w-20 z-40",
        "backdrop-blur-xl bg-black/20 border-r border-white/10",
        "flex flex-col items-center justify-between py-6",
        "transition-all duration-300",
        className
      )}
    >
      {/* Top Section - Menu Toggle */}
      <div className="space-y-8">
        <button
          onClick={() => setIsOpen(false)}
          className="p-3 rounded-xl hover:bg-white/10 transition-all"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        {/* Navigation Icons */}
        <nav className="flex flex-col items-center space-y-6 mt-8">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.label}
                to={item.href}
                className={cn(
                  "p-3 rounded-xl transition-all",
                  "hover:bg-white/10 relative group",
                  isActive && "bg-white/20"
                )}
                title={item.label}
              >
                <Icon className={cn(
                  "w-6 h-6",
                  isActive ? "text-white" : "text-white/70"
                )} />
                
                {/* Tooltip */}
                <span className="absolute left-full ml-4 px-3 py-1.5 rounded-lg bg-black/90 text-white text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="flex flex-col items-center space-y-6">
        {/* Shopping Cart */}
        <Link
          to="/pricing"
          className="p-3 rounded-xl hover:bg-white/10 transition-all group relative"
          title="Pricing"
        >
          <ShoppingCart className="w-6 h-6 text-white/70 group-hover:text-white" />
          
          {/* Tooltip */}
          <span className="absolute left-full ml-4 px-3 py-1.5 rounded-lg bg-black/90 text-white text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Pricing
          </span>
        </Link>

        {/* Copyright Text (Vertical) */}
        <div className="text-white/50 text-xs tracking-wider transform -rotate-90 origin-center whitespace-nowrap mt-12">
          © 2025
        </div>
      </div>
    </aside>
  );
};
