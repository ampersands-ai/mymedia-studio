'use client';

import dynamic from 'next/dynamic';

const BlogList = dynamic(() => import('@/views/BlogList'), { ssr: false });

export default function BlogListClient() {
  return <BlogList />;
}
