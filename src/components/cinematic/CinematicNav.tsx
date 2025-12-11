import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

const navItems = [
  { id: "hero", label: "Home" },
  { id: "portfolio", label: "Work" },
  { id: "about", label: "About" },
  { id: "contact", label: "Contact" },
];

export const CinematicNav = () => {
  const [activeSection, setActiveSection] = useState("hero");
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);

      // Determine active section
      const sections = navItems.map(item => document.getElementById(item.id));
      const scrollPos = window.scrollY + 100;

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        if (section && section.offsetTop <= scrollPos) {
          setActiveSection(navItems[i].id);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

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
        <Link 
          to="/" 
          className="text-xl font-bold text-white hover:text-white/80 transition-colors"
        >
          ARTIFIO
        </Link>

        {/* Nav Links */}
        <div className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className={cn(
                "relative text-sm font-medium transition-colors py-2",
                activeSection === item.id
                  ? "text-white"
                  : "text-white/60 hover:text-white"
              )}
            >
              {item.label}
              {activeSection === item.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
              )}
            </button>
          ))}
        </div>

        {/* CTA */}
        <Link
          to="/auth"
          className="px-5 py-2 text-sm font-medium text-black bg-white rounded-full hover:bg-white/90 transition-colors"
        >
          Get Started
        </Link>
      </div>
    </nav>
  );
};
