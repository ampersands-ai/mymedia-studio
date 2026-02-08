'use client';

import dynamic from 'next/dynamic';

const UserGenerations = dynamic(() => import('@/views/admin/UserGenerations'), { ssr: false });

export default function UserGenerationsPage() {
  return <UserGenerations />;
}
