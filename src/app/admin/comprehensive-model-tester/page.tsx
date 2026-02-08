'use client';

import dynamic from 'next/dynamic';

const ComprehensiveModelTester = dynamic(() => import('@/views/admin/ComprehensiveModelTester'), { ssr: false });

export default function ComprehensiveModelTesterPage() {
  return <ComprehensiveModelTester />;
}
