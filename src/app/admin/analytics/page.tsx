'use client';

import dynamic from 'next/dynamic';

const Analytics = dynamic(() => import('@/views/admin/Analytics'), { ssr: false });

export default function AnalyticsPage() {
  return <Analytics />;
}
