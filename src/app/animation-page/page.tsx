'use client';

import dynamic from 'next/dynamic';

const AnimationPage = dynamic(() => import('@/views/AnimationPage'), { ssr: false });

export default function AnimationPageRoute() {
  return <AnimationPage />;
}
