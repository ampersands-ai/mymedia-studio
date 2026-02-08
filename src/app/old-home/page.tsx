'use client';

import dynamic from 'next/dynamic';

const IndexV2 = dynamic(() => import('@/views/IndexV2'), { ssr: false });

export default function OldHomePage() {
  return <IndexV2 />;
}
