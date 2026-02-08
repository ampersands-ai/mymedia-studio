'use client';

import dynamic from 'next/dynamic';

const ModelDirectory = dynamic(() => import('@/views/ModelDirectory'), { ssr: false });

export default function ModelDirectoryPage() {
  return <ModelDirectory />;
}
