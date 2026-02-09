import type { Metadata } from 'next';
import SharedContentClient from './_client';

export const metadata: Metadata = {
  title: 'Shared Creation',
  description: 'View this AI-generated content shared from our platform.',
  openGraph: {
    title: 'Shared Creation',
    description: 'View this AI-generated content shared from our platform.',
  },
};

export default function SharedContentPage() {
  return <SharedContentClient />;
}
