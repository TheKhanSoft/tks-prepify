
import type { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Login',
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
