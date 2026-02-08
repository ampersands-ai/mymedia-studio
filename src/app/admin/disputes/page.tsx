'use client';

import dynamic from 'next/dynamic';

const TokenDisputes = dynamic(() => import('@/views/admin/TokenDisputes').then(mod => ({ default: mod.TokenDisputes })), { ssr: false });

export default function TokenDisputesPage() {
  return <TokenDisputes />;
}
