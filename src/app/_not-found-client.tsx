'use client';

import dynamic from 'next/dynamic';

const NotFound = dynamic(() => import('@/views/NotFound'), { ssr: false });

export default function NotFoundClient() {
  return <NotFound />;
}
