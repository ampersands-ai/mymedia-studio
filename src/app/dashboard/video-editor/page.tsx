'use client';

import dynamic from 'next/dynamic';

const VideoEditorPage = dynamic(() => import('@/views/VideoEditorPage'), { ssr: false });

export default function VideoEditorRoutePage() {
  return <VideoEditorPage />;
}
