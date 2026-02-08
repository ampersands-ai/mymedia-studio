'use client';

import dynamic from 'next/dynamic';

const AdminDashboard = dynamic(() => import('@/views/admin/AdminDashboard'), { ssr: false });

export default function AdminDashboardPage() {
  return <AdminDashboard />;
}
