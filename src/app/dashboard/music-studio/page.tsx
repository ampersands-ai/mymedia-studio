'use client';

import dynamic from 'next/dynamic';

const MusicStudioPage = dynamic(() => import('@/views/MusicStudioPage'), { ssr: false });

export default function MusicStudioRoutePage() {
  return <MusicStudioPage />;
}
