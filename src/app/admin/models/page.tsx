'use client';

import dynamic from 'next/dynamic';

const AIModelsDashboard = dynamic(() => import('@/views/admin/AIModelsDashboard'), { ssr: false });

export default function AIModelsDashboardPage() {
  return <AIModelsDashboard />;
}
