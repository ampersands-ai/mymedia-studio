import type { Metadata } from 'next';
import FAQClient from './_client';

export const metadata: Metadata = {
  title: 'FAQ | Frequently Asked Questions',
  description:
    'Find answers to common questions about our AI content creation platform. Learn about pricing, features, account management, and more.',
  openGraph: {
    title: 'FAQ | Frequently Asked Questions',
    description:
      'Find answers to common questions about our AI content creation platform. Learn about pricing, features, account management, and more.',
  },
};

export default function FAQPage() {
  return <FAQClient />;
}
