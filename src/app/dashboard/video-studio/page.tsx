'use client';

import dynamic from 'next/dynamic';

const VideoStudio = dynamic(() => import('@/views/VideoStudio'), { ssr: false });

export default function VideoStudioPage() {
  return <VideoStudio />;
}
