'use client';

import dynamic from 'next/dynamic';

const BackgroundLibrary = dynamic(() => import('@/views/BackgroundLibrary'), { ssr: false });

export default function BackgroundsPage() {
  return <BackgroundLibrary />;
}
