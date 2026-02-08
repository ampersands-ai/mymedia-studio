'use client';

import dynamic from 'next/dynamic';

const MigrateStoryboards = dynamic(() => import('@/views/admin/MigrateStoryboards'), { ssr: false });

export default function MigrateStoryboardsPage() {
  return <MigrateStoryboards />;
}
