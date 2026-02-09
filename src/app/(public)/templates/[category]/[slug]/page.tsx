import type { Metadata } from 'next';
import TemplateLandingClient from './_client';

type Props = { params: Promise<{ category: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const title = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return {
    title: `${title} | Template`,
    description: `Use our ${title} AI template to create professional content instantly. Customize and generate with one click.`,
    openGraph: {
      title: `${title} | Template`,
    },
  };
}

export default function TemplateLandingPage() {
  return <TemplateLandingClient />;
}
