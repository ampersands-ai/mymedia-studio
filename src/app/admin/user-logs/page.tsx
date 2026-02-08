'use client';

import dynamic from 'next/dynamic';

const UserLogs = dynamic(() => import('@/views/admin/UserLogs'), { ssr: false });

export default function UserLogsPage() {
  return <UserLogs />;
}
