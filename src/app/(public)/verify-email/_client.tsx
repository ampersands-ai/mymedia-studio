'use client';

import dynamic from 'next/dynamic';

const VerifyEmail = dynamic(() => import('@/views/VerifyEmail'), { ssr: false });

export default function VerifyEmailClient() {
  return <VerifyEmail />;
}
