'use client';

import dynamic from 'next/dynamic';

const CustomCreation = dynamic(() => import('@/views/CustomCreation'), { ssr: false });

export default function CustomCreationPage() {
  return <CustomCreation />;
}
