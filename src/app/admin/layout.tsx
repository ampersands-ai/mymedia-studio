'use client';

import { AdminLayout } from '@/layouts/AdminLayout';

export default function AdminRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayout>{children}</AdminLayout>;
}
