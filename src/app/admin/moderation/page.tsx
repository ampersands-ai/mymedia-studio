'use client';

import dynamic from 'next/dynamic';

const ModerationDashboard = dynamic(() => import('@/views/admin/ModerationDashboard'), { ssr: false });

export default function ModerationDashboardPage() {
  return <ModerationDashboard />;
}
