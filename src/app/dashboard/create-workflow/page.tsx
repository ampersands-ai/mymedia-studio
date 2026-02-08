'use client';

import dynamic from 'next/dynamic';

const CreateWorkflow = dynamic(() => import('@/views/CreateWorkflow'), { ssr: false });

export default function CreateWorkflowPage() {
  return <CreateWorkflow />;
}
