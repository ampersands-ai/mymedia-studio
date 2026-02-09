'use client';

import dynamic from 'next/dynamic';

const BlogPost = dynamic(() => import('@/views/BlogPost'), { ssr: false });

export default function BlogPostClient() {
  return <BlogPost />;
}
