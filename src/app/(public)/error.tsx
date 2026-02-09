'use client';

import { useEffect } from 'react';

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Page error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="mx-auto max-w-md text-center">
        <h2 className="mb-4 text-2xl font-bold text-foreground">
          Page Error
        </h2>
        <p className="mb-6 text-muted-foreground">
          We couldn&apos;t load this page. Please try again.
        </p>
        <button
          onClick={reset}
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
