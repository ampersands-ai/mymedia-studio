'use client';

import dynamic from 'next/dynamic';

const EmailSettings = dynamic(() => import('@/views/admin/EmailSettings'), { ssr: false });

export default function EmailSettingsPage() {
  return <EmailSettings />;
}
