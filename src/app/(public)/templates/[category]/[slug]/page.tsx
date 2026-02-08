'use client';

import dynamic from 'next/dynamic';

const TemplateLanding = dynamic(() => import('@/views/TemplateLanding'), { ssr: false });

export default function TemplateLandingPage() {
  return <TemplateLanding />;
}
