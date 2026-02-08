'use client';

import dynamic from 'next/dynamic';

const TestModelGroupPage = dynamic(() => import('@/views/admin/TestModelGroupPage'), { ssr: false });

export default function TestModelGroupRoutePage() {
  return <TestModelGroupPage />;
}
