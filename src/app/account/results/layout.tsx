
import type { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'My Results',
  description: 'Review your complete test history and performance.',
};

export default function AccountResultsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
