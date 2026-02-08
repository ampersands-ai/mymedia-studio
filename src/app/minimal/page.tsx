'use client';

import dynamic from 'next/dynamic';

const IndexMinimal = dynamic(() => import('@/views/IndexMinimal'), { ssr: false });

export default function MinimalPage() {
  return <IndexMinimal />;
}
