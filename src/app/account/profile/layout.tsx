
import type { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'My Profile',
  description: 'Manage your user profile and account settings.',
};

export default function AccountProfileLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
