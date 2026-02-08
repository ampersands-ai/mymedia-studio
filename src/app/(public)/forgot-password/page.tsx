'use client';

import dynamic from 'next/dynamic';

const ForgotPassword = dynamic(() => import('@/views/ForgotPassword'), { ssr: false });

export default function ForgotPasswordPage() {
  return <ForgotPassword />;
}
