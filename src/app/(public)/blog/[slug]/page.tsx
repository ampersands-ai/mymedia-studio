import type { Metadata } from 'next';
import BlogPostClient from './_client';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const title = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return {
    title: `${title} | Blog`,
    description: `Read our article about ${title.toLowerCase()}. Tips, tutorials, and insights on AI content creation.`,
    openGraph: {
      title: `${title} | Blog`,
      type: 'article',
    },
  };
}

export default function BlogPostPage() {
  return <BlogPostClient />;
}
