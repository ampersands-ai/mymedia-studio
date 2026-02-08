'use client';

import dynamic from 'next/dynamic';

const ModelPricing = dynamic(() => import('@/views/admin/ModelPricing'), { ssr: false });

export default function ModelPricingPage() {
  return <ModelPricing />;
}
