'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { MediaProvider } from '@/contexts/MediaContext';
import { BrandProvider } from '@/contexts/BrandContext';
import { CookieConsentBanner } from '@/components/gdpr/CookieConsentBanner';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { ScrollProgress } from '@/components/ui/scroll-progress';
import { queryClient } from '@/lib/queryClient';
import type { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
        <BrandProvider>
          <AuthProvider>
            <MediaProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <ScrollProgress />
                {children}
                <CookieConsentBanner />
              </TooltipProvider>
            </MediaProvider>
          </AuthProvider>
        </BrandProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
