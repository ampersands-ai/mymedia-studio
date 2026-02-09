import type { Metadata } from 'next';
import TermsClient from './_client';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'Read our terms of service governing the use of our AI content creation platform.',
  openGraph: {
    title: 'Terms of Service',
    description:
      'Read our terms of service governing the use of our AI content creation platform.',
  },
};

export default function TermsPage() {
  return <TermsClient />;
}
