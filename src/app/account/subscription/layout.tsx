
import type { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'My Subscription',
  description: 'Manage your subscription plan and view billing history.',
};

export default function SubscriptionLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
