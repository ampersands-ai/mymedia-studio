import type { Metadata } from 'next';
import AboutClient from './_client';

export const metadata: Metadata = {
  title: 'About Us | Create Anything. Instantly.',
  description:
    'Discover our AI-powered platform with 30+ models for creating videos, images, music, and more. Professional quality content creation made accessible to everyone.',
  openGraph: {
    title: 'About Us | Create Anything. Instantly.',
    description:
      'Discover our AI-powered platform with 30+ models for creating videos, images, music, and more. Professional quality content creation made accessible to everyone.',
  },
};

export default function AboutPage() {
  return <AboutClient />;
}
