'use client';

import dynamic from 'next/dynamic';

const TemplateAnalytics = dynamic(() => import('@/views/admin/TemplateAnalytics'), { ssr: false });

export default function TemplateAnalyticsPage() {
  return <TemplateAnalytics />;
}
