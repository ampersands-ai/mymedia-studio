'use client';

import dynamic from 'next/dynamic';

const CreateBlog = dynamic(() => import('@/views/admin/CreateBlog'), { ssr: false });

export default function CreateBlogPage() {
  return <CreateBlog />;
}
