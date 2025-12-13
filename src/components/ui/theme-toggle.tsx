import { useEffect } from "react";

export const ThemeToggle = (_props: { className?: string }) => {
  useEffect(() => {
    // Always enforce dark mode
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }, []);

  // Component hidden - dark mode only
  return null;
};
