'use client';

import dynamic from 'next/dynamic';

const TemplatesManager = dynamic(() => import('@/views/admin/TemplatesManager'), { ssr: false });

export default function TemplatesManagerPage() {
  return <TemplatesManager />;
}
