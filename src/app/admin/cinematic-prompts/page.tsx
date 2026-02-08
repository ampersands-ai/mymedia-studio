'use client';

import dynamic from 'next/dynamic';

const CinematicPromptsManager = dynamic(() => import('@/views/admin/CinematicPromptsManager'), { ssr: false });

export default function CinematicPromptsManagerPage() {
  return <CinematicPromptsManager />;
}
