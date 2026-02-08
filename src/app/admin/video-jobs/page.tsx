'use client';

import dynamic from 'next/dynamic';

const VideoJobs = dynamic(() => import('@/views/admin/VideoJobs'), { ssr: false });

export default function VideoJobsPage() {
  return <VideoJobs />;
}
