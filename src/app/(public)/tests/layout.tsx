
import type { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Practice Tests',
};

export default function TestsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
