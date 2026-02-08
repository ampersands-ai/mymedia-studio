'use client';

import dynamic from 'next/dynamic';

const AdvancedAnalytics = dynamic(() => import('@/views/admin/AdvancedAnalytics').then(mod => ({ default: mod.AdvancedAnalytics })), { ssr: false });

export default function AdvancedAnalyticsPage() {
  return <AdvancedAnalytics />;
}
