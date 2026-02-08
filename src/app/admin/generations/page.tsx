'use client';

import dynamic from 'next/dynamic';

const AllGenerations = dynamic(() => import('@/views/admin/AllGenerations'), { ssr: false });

export default function AllGenerationsPage() {
  return <AllGenerations />;
}
