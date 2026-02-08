'use client';

import { lazy, Suspense } from 'react';
import { brand } from '@/config/brand';

const CinematicTest = lazy(() => import('@/pages/CinematicTest'));

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="flex items-center gap-3 animate-pulse">
            <span className="font-black text-2xl md:text-3xl text-foreground">
              {brand.name}
            </span>
          </div>
        </div>
      }
    >
      <CinematicTest />
    </Suspense>
  );
}
