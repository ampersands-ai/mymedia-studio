import type { Metadata } from 'next';
import PrivacyClient from './_client';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'Read our privacy policy to understand how we collect, use, and protect your personal data on our AI content creation platform.',
  openGraph: {
    title: 'Privacy Policy',
    description:
      'Read our privacy policy to understand how we collect, use, and protect your personal data on our AI content creation platform.',
  },
};

export default function PrivacyPage() {
  return <PrivacyClient />;
}
