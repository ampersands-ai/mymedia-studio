'use client';

import dynamic from 'next/dynamic';

const PromptLibrary = dynamic(() => import('@/views/PromptLibrary'), { ssr: false });

export default function PromptsPage() {
  return <PromptLibrary />;
}
