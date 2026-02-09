import type { Metadata } from 'next';
import ModerationDocsClient from './_client';

export const metadata: Metadata = {
  title: 'Content Moderation Policy',
  description:
    'Learn about our content moderation policies, safety guidelines, and responsible AI usage standards.',
  openGraph: {
    title: 'Content Moderation Policy',
    description:
      'Learn about our content moderation policies, safety guidelines, and responsible AI usage standards.',
  },
};

export default function ModerationDocsPage() {
  return <ModerationDocsClient />;
}
