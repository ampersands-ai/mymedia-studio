import type { Metadata } from 'next';
import NotFoundClient from './_not-found-client';

export const metadata: Metadata = {
  title: 'Page Not Found',
  description: 'The page you are looking for does not exist.',
  robots: 'noindex, nofollow',
};

export default function NotFoundPage() {
  return <NotFoundClient />;
}
