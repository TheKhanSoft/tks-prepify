
import type { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'My Orders',
  description: 'View your complete order history.',
};

export default function AccountOrdersLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
