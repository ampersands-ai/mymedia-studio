import type { Metadata } from 'next';
import FeaturesClient from './_client';

export const metadata: Metadata = {
  title: 'Features | AI-Powered Content Creation Tools',
  description:
    'Explore our comprehensive suite of AI tools for video generation, image creation, music production, avatar creation, and more. 30+ models at your fingertips.',
  openGraph: {
    title: 'Features | AI-Powered Content Creation Tools',
    description:
      'Explore our comprehensive suite of AI tools for video generation, image creation, music production, avatar creation, and more. 30+ models at your fingertips.',
  },
};

export default function FeaturesPage() {
  return <FeaturesClient />;
}
