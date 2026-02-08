'use client';

import dynamic from 'next/dynamic';

const GenerationLedger = dynamic(() => import('@/views/admin/GenerationLedger'), { ssr: false });

export default function GenerationLedgerPage() {
  return <GenerationLedger />;
}
