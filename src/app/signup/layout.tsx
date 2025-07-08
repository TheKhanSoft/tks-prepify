
import type { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Sign Up',
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
