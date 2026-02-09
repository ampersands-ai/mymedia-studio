'use client';

import dynamic from 'next/dynamic';

const Help = dynamic(() => import('@/views/Help'), { ssr: false });

export default function HelpClient() {
  return <Help />;
}
