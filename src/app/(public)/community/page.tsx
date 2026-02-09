import type { Metadata } from 'next';
import CommunityClient from './_client';

export const metadata: Metadata = {
  title: 'Community Creations | Explore AI Art',
  description:
    'Browse stunning AI-generated art and content from our creative community. Get inspired and share your own AI creations.',
  openGraph: {
    title: 'Community Creations | Explore AI Art',
    description:
      'Browse stunning AI-generated art and content from our creative community. Get inspired and share your own AI creations.',
  },
};

export default function CommunityPage() {
  return <CommunityClient />;
}
