import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export const ThemeToggle = ({ className = "" }: { className?: string }) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Read from localStorage on mount
    const stored = localStorage.getItem('theme');
    const dark = stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setIsDark(dark);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', newTheme ? 'dark' : 'light');
  };

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "p-2 rounded-lg transition-colors",
        "hover:bg-gray-100 dark:hover:bg-gray-800",
        className
      )}
      aria-label="Toggle theme"
    >
      {isDark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
};
