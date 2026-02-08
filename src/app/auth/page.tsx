'use client';

import dynamic from 'next/dynamic';

const Auth = dynamic(() => import('@/views/Auth'), { ssr: false });

export default function AuthPage() {
  return <Auth />;
}
