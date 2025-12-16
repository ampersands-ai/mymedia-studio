import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { id: "features", label: "Features", href: "/features" },
  { id: "pricing", label: "Pricing", href: "/pricing" },
  { id: "blog", label: "Blog", href: "/blog" },
];

export const CinematicNav = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

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

        {/* Desktop Nav Links */}
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

        {/* Desktop CTA + Theme Toggle */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          {user ? (
            <Link
              to="/dashboard/custom-creation"
              className="px-5 py-2 text-sm font-bold uppercase tracking-wide text-foreground bg-gradient-to-r from-primary-yellow to-primary-orange hover:shadow-lg hover:shadow-primary-orange/30 transition-all rounded-2xl"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              to="/auth"
              className="px-5 py-2 text-sm font-bold uppercase tracking-wide text-foreground bg-gradient-to-r from-primary-yellow to-primary-orange hover:shadow-lg hover:shadow-primary-orange/30 transition-all rounded-2xl"
            >
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile Menu */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <button
              className="md:hidden p-2 text-white hover:bg-white/10 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          </SheetTrigger>
          <SheetContent 
            side="right" 
            className="w-[300px] bg-black/95 backdrop-blur-xl border-l border-white/10 p-0"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <Link to="/" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
                  <img 
                    src="/logos/artifio.png" 
                    alt="Artifio" 
                    className="h-7 w-auto"
                  />
                  <span className="text-lg font-bold text-white">artifio.ai</span>
                </Link>
                <ThemeToggle />
              </div>

              {/* Nav Links */}
              <div className="flex-1 py-8">
                <div className="flex flex-col gap-2 px-6">
                  {navItems.map((item) => (
                    <Link
                      key={item.id}
                      to={item.href}
                      onClick={() => setIsOpen(false)}
                      className="text-lg font-medium uppercase tracking-wide py-4 text-white/70 hover:text-white hover:pl-2 transition-all border-b border-white/5"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className="p-6 border-t border-white/10">
                {user ? (
                  <Link
                    to="/dashboard/custom-creation"
                    onClick={() => setIsOpen(false)}
                    className="block w-full text-center px-5 py-4 text-sm font-bold uppercase tracking-wide text-foreground bg-gradient-to-r from-primary-yellow to-primary-orange hover:shadow-lg hover:shadow-primary-orange/30 transition-all rounded-2xl"
                  >
                    Dashboard
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/auth"
                      onClick={() => setIsOpen(false)}
                      className="block w-full text-center px-5 py-4 text-sm font-bold uppercase tracking-wide text-foreground bg-gradient-to-r from-primary-yellow to-primary-orange hover:shadow-lg hover:shadow-primary-orange/30 transition-all rounded-2xl"
                    >
                      Sign In
                    </Link>
                    <Link
                      to="/auth?mode=signup"
                      onClick={() => setIsOpen(false)}
                      className="block w-full text-center px-5 py-4 mt-3 text-sm font-medium uppercase tracking-wide text-white border border-white/30 hover:bg-white/10 transition-all rounded-2xl"
                    >
                      Sign Up Free
                    </Link>
                  </>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
};