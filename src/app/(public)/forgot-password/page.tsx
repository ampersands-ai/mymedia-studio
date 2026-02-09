import type { Metadata } from 'next';
import ForgotPasswordClient from './_client';

export const metadata: Metadata = {
  title: 'Forgot Password',
  description:
    'Reset your password to regain access to your AI content creation account.',
  openGraph: {
    title: 'Forgot Password',
    description:
      'Reset your password to regain access to your AI content creation account.',
  },
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordClient />;
}
