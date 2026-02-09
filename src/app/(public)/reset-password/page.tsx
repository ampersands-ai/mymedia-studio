import type { Metadata } from 'next';
import ResetPasswordClient from './_client';

export const metadata: Metadata = {
  title: 'Reset Password',
  description: 'Set a new password for your account.',
  openGraph: {
    title: 'Reset Password',
    description: 'Set a new password for your account.',
  },
};

export default function ResetPasswordPage() {
  return <ResetPasswordClient />;
}
