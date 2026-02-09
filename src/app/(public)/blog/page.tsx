import type { Metadata } from 'next';
import BlogListClient from './_client';

export const metadata: Metadata = {
  title: 'Blog | AI Content Creation Insights',
  description:
    'Stay updated with the latest tips, tutorials, and insights on AI content creation. Learn how to create stunning videos, images, and music with AI.',
  openGraph: {
    title: 'Blog | AI Content Creation Insights',
    description:
      'Stay updated with the latest tips, tutorials, and insights on AI content creation. Learn how to create stunning videos, images, and music with AI.',
  },
};

export default function BlogListPage() {
  return <BlogListClient />;
}
