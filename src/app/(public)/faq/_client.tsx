'use client';

import dynamic from 'next/dynamic';

const FAQ = dynamic(() => import('@/views/FAQ'), { ssr: false });

export default function FAQClient() {
  return <FAQ />;
}
