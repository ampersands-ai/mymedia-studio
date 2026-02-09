import type { Metadata } from 'next';
import HelpClient from './_client';

export const metadata: Metadata = {
  title: 'Help Center | Guides & Support',
  description:
    'Comprehensive help center with guides, tutorials, and support resources for our AI content creation platform.',
  openGraph: {
    title: 'Help Center | Guides & Support',
    description:
      'Comprehensive help center with guides, tutorials, and support resources for our AI content creation platform.',
  },
};

export default function HelpPage() {
  return <HelpClient />;
}
