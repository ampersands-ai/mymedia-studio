import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo.png';

export const EnhancedHeader = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useAuth();

  // Smooth scroll detection with requestAnimationFrame
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, []);

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled
          ? 'backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 shadow-lg border-b border-white/20 dark:border-gray-800/20'
          : 'bg-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <img 
              src={logo} 
              alt="artifio.ai logo" 
              className="w-10 h-10 object-contain transition-transform group-hover:scale-110"
            />
            <span className="text-xl font-bold bg-gradient-to-r from-primary-yellow to-primary-orange bg-clip-text text-transparent">
              artifio.ai
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              to="/templates"
              className="text-gray-800 dark:text-gray-200 hover:text-primary-orange dark:hover:text-primary-yellow transition-colors font-medium"
            >
              Templates
            </Link>
            <Link
              to="/create"
              className="text-gray-800 dark:text-gray-200 hover:text-primary-orange dark:hover:text-primary-yellow transition-colors font-medium"
            >
              Create
            </Link>
            <Link
              to="/pricing"
              className="text-gray-800 dark:text-gray-200 hover:text-primary-orange dark:hover:text-primary-yellow transition-colors font-medium"
            >
              Pricing
            </Link>
            <Link
              to="/features"
              className="text-gray-800 dark:text-gray-200 hover:text-primary-orange dark:hover:text-primary-yellow transition-colors font-medium"
            >
              Features
            </Link>
          </nav>

          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            {/* Theme toggle */}
            <ThemeToggle />

            {/* Auth buttons - Desktop */}
            <div className="hidden md:flex items-center space-x-3">
              {user ? (
                <Button asChild>
                  <Link to="/dashboard/history">Dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button variant="ghost" asChild>
                    <Link to="/auth">Sign In</Link>
                  </Button>
                  <Button asChild className="bg-gradient-to-r from-primary-yellow to-primary-orange text-white hover:shadow-lg transition-all">
                    <Link to="/auth">Get Started</Link>
                  </Button>
                </>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden backdrop-blur-xl bg-white/95 dark:bg-gray-900/95 border-t border-gray-200 dark:border-gray-800 animate-fade-in">
          <nav className="px-4 py-6 space-y-4">
            <Link
              to="/templates"
              className="block py-3 px-4 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Templates
            </Link>
            <Link
              to="/create"
              className="block py-3 px-4 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Create
            </Link>
            <Link
              to="/pricing"
              className="block py-3 px-4 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Pricing
            </Link>
            <Link
              to="/features"
              className="block py-3 px-4 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Features
            </Link>

            {/* Mobile auth buttons */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
              {user ? (
                <Button asChild className="w-full">
                  <Link to="/dashboard/history" onClick={() => setIsMobileMenuOpen(false)}>
                    Dashboard
                  </Link>
                </Button>
              ) : (
                <>
                  <Button variant="outline" asChild className="w-full">
                    <Link to="/auth" onClick={() => setIsMobileMenuOpen(false)}>
                      Sign In
                    </Link>
                  </Button>
                  <Button asChild className="w-full bg-gradient-to-r from-primary-yellow to-primary-orange text-white">
                    <Link to="/auth" onClick={() => setIsMobileMenuOpen(false)}>
                      Get Started
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};
