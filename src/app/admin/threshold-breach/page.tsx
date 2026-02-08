'use client';

import dynamic from 'next/dynamic';

const ThresholdBreach = dynamic(() => import('@/views/admin/ThresholdBreach'), { ssr: false });

export default function ThresholdBreachPage() {
  return <ThresholdBreach />;
}
