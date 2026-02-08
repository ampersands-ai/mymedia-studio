'use client';

import dynamic from 'next/dynamic';

const CinematicTest = dynamic(() => import('@/views/CinematicTest'), { ssr: false });

export default function HomePage() {
  return <CinematicTest />;
}
