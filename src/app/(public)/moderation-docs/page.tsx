'use client';

import dynamic from 'next/dynamic';

const ModerationDocs = dynamic(() => import('@/views/ModerationDocs'), { ssr: false });

export default function ModerationDocsPage() {
  return <ModerationDocs />;
}
