'use client';

import dynamic from 'next/dynamic';

const ModelPagesManager = dynamic(() => import('@/views/admin/ModelPagesManager'), { ssr: false });

export default function ModelPagesManagerPage() {
  return <ModelPagesManager />;
}
