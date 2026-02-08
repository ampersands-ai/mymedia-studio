'use client';

import dynamic from 'next/dynamic';

const FeatureSettings = dynamic(() => import('@/views/admin/FeatureSettings'), { ssr: false });

export default function FeatureSettingsPage() {
  return <FeatureSettings />;
}
