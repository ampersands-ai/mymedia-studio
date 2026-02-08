'use client';

import dynamic from 'next/dynamic';

const History = dynamic(() => import('@/views/dashboard/History'), { ssr: false });

export default function HistoryPage() {
  return <History />;
}
