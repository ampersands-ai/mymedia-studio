'use client';

import dynamic from 'next/dynamic';

const WebhookMonitor = dynamic(() => import('@/views/admin/WebhookMonitor'), { ssr: false });

export default function WebhookMonitorPage() {
  return <WebhookMonitor />;
}
