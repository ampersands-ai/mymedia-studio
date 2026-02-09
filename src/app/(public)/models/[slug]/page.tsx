import type { Metadata } from 'next';
import ModelLandingClient from './_client';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const title = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return {
    title: `${title} | AI Model`,
    description: `Create stunning content with our ${title} AI model. Explore capabilities, pricing, and example outputs.`,
    openGraph: {
      title: `${title} | AI Model`,
    },
  };
}

export default function ModelLandingPage() {
  return <ModelLandingClient />;
}
