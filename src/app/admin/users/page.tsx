'use client';

import dynamic from 'next/dynamic';

const UsersManager = dynamic(() => import('@/views/admin/UsersManager'), { ssr: false });

export default function UsersManagerPage() {
  return <UsersManager />;
}
