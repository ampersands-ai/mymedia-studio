'use client';

import dynamic from 'next/dynamic';

const StoryboardMinimal = dynamic(() => import('@/views/StoryboardMinimal'), { ssr: false });

export default function StoryboardMinimalPage() {
  return <StoryboardMinimal />;
}
