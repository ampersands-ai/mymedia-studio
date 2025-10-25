import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface SmartLoaderProps {
  minDuration?: number;
  message?: string;
}

export function SmartLoader({ 
  minDuration = 500,
  message = 'Loading...'
}: SmartLoaderProps) {
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    // Always show loader for at least minDuration
    // Prevents flash of loading state
    const timer = setTimeout(() => {
      setShowLoader(false);
    }, minDuration);

    return () => clearTimeout(timer);
  }, [minDuration]);

  if (!showLoader) return null;

  return (
    <div className="flex flex-col items-center justify-center p-12">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="mt-4 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
