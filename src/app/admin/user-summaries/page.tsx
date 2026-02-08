'use client';

import dynamic from 'next/dynamic';

const UserDailySummaries = dynamic(() => import('@/views/admin/UserDailySummaries'), { ssr: false });

export default function UserDailySummariesPage() {
  return <UserDailySummaries />;
}
