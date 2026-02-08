'use client';

import dynamic from 'next/dynamic';

const EmailHistory = dynamic(() => import('@/views/admin/EmailHistory').then(mod => ({ default: mod.EmailHistory })), { ssr: false });

export default function EmailHistoryPage() {
  return <EmailHistory />;
}
