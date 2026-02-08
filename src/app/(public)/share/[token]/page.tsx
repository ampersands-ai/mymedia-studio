'use client';

import dynamic from 'next/dynamic';

const SharedContent = dynamic(() => import('@/views/SharedContent'), { ssr: false });

export default function SharedContentPage() {
  return <SharedContent />;
}
