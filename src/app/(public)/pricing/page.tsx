'use client';

import dynamic from 'next/dynamic';

const Pricing = dynamic(() => import('@/views/Pricing'), { ssr: false });

export default function PricingPage() {
  return <Pricing />;
}
