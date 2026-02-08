'use client';

import dynamic from 'next/dynamic';

const TemplateLandingEditor = dynamic(() => import('@/views/admin/TemplateLandingEditor'), { ssr: false });

export default function TemplateLandingEditorPage() {
  return <TemplateLandingEditor />;
}
