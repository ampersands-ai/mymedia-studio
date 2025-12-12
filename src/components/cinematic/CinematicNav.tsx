import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

const navItems = [
  { id: "features", label: "Features", href: "/features" },
  { id: "pricing", label: "Pricing", href: "/pricing" },
  { id: "blog", label: "Blog", href: "/blog" },
];

export const CinematicNav = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-black/90 backdrop-blur-md border-b border-white/10"
          : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <img 
            src="/logos/artifio.png" 
            alt="Artifio" 
            className="h-8 w-auto"
          />
          <span className="text-xl font-bold text-white">artifio.ai</span>
        </Link>

        {/* Nav Links */}
        <div className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <Link
              key={item.id}
              to={item.href}
              className="text-sm font-medium uppercase tracking-wide transition-colors py-2 text-white/70 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* CTA */}
        <Link
          to="/dashboard"
          className="px-5 py-2 text-sm font-bold uppercase tracking-wide text-foreground bg-gradient-to-r from-primary-yellow to-primary-orange hover:shadow-lg hover:shadow-primary-orange/30 transition-all"
        >
          Dashboard
        </Link>
      </div>
    </nav>
  );
};
