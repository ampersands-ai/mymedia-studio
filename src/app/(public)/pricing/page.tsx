import type { Metadata } from 'next';
import PricingClient from './_client';

export const metadata: Metadata = {
  title: 'Pricing | AI Content Creation Plans',
  description:
    'Affordable AI content creation plans starting from $7.99/mo. Compare features across Free, Pro, and Business tiers. No hidden fees, cancel anytime.',
  openGraph: {
    title: 'Pricing | AI Content Creation Plans',
    description:
      'Affordable AI content creation plans starting from $7.99/mo. Compare features across Free, Pro, and Business tiers. No hidden fees, cancel anytime.',
  },
};

export default function PricingPage() {
  return <PricingClient />;
}
