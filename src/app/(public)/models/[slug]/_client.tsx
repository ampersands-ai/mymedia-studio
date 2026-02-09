'use client';

import dynamic from 'next/dynamic';

const ModelLanding = dynamic(() => import('@/views/ModelLanding'), { ssr: false });

export default function ModelLandingClient() {
  return <ModelLanding />;
}
