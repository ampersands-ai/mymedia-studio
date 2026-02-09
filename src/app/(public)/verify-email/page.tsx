import type { Metadata } from 'next';
import VerifyEmailClient from './_client';

export const metadata: Metadata = {
  title: 'Verify Email',
  description: 'Verify your email address to activate your account.',
  openGraph: {
    title: 'Verify Email',
    description: 'Verify your email address to activate your account.',
  },
};

export default function VerifyEmailPage() {
  return <VerifyEmailClient />;
}
