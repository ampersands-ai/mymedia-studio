'use client';

import dynamic from 'next/dynamic';

const SecurityDashboard = dynamic(() => import('@/views/admin/SecurityDashboard'), { ssr: false });

export default function SecurityDashboardPage() {
  return <SecurityDashboard />;
}
