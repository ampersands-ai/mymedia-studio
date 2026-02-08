'use client';

import dynamic from 'next/dynamic';

const ModelPageEditor = dynamic(() => import('@/views/admin/ModelPageEditor'), { ssr: false });

export default function ModelPageEditorPage() {
  return <ModelPageEditor />;
}
