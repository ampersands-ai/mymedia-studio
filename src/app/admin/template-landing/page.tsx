'use client';

import dynamic from 'next/dynamic';

const TemplateLandingManager = dynamic(() => import('@/views/admin/TemplateLandingManager'), { ssr: false });

export default function TemplateLandingManagerPage() {
  return <TemplateLandingManager />;
}
