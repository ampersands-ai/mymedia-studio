'use client';

import dynamic from 'next/dynamic';

const Community = dynamic(() => import('@/views/Community'), { ssr: false });

export default function CommunityPage() {
  return <Community />;
}
