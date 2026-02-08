'use client';

import dynamic from 'next/dynamic';

const CreateMinimal = dynamic(() => import('@/views/CreateMinimal'), { ssr: false });

export default function CreateMinimalPage() {
  return <CreateMinimal />;
}
