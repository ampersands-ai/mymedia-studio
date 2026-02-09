'use client';

import dynamic from 'next/dynamic';

const Features = dynamic(() => import('@/views/Features'), { ssr: false });

export default function FeaturesClient() {
  return <Features />;
}
