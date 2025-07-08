
import type { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'My Support Tickets',
  description: 'View and manage your support tickets.',
};

export default function SupportTicketsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
