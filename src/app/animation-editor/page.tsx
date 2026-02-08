'use client';

import dynamic from 'next/dynamic';

const AnimationEditorPage = dynamic(() => import('@/views/AnimationEditorPage'), { ssr: false });

export default function AnimationEditorRoute() {
  return <AnimationEditorPage />;
}
