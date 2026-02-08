'use client';

import dynamic from 'next/dynamic';

const BackgroundGenerator = dynamic(() => import('@/views/BackgroundGenerator'), { ssr: false });

export default function GeneratorPage() {
  return <BackgroundGenerator />;
}
