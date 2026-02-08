'use client';

import dynamic from 'next/dynamic';

const StoryboardPage = dynamic(() => import('@/views/StoryboardPage'), { ssr: false });

export default function StoryboardRoutePage() {
  return <StoryboardPage />;
}
