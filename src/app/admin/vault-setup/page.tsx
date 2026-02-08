'use client';

import dynamic from 'next/dynamic';

const VaultSetup = dynamic(() => import('@/views/admin/VaultSetup'), { ssr: false });

export default function VaultSetupPage() {
  return <VaultSetup />;
}
