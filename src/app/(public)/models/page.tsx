import type { Metadata } from 'next';
import ModelDirectoryClient from './_client';

export const metadata: Metadata = {
  title: 'AI Models Directory | Browse All Models',
  description:
    'Explore our directory of 30+ AI models for video generation, image creation, music production, and more. Find the perfect model for your project.',
  openGraph: {
    title: 'AI Models Directory | Browse All Models',
    description:
      'Explore our directory of 30+ AI models for video generation, image creation, music production, and more. Find the perfect model for your project.',
  },
};

export default function ModelDirectoryPage() {
  return <ModelDirectoryClient />;
}
