'use client';

import dynamic from 'next/dynamic';

const TemplateCategoriesManager = dynamic(() => import('@/views/admin/TemplateCategoriesManager'), { ssr: false });

export default function TemplateCategoriesManagerPage() {
  return <TemplateCategoriesManager />;
}
