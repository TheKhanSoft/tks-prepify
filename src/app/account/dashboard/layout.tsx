
import type { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'View your account dashboard and summary.',
};

export default function AccountDashboardLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
