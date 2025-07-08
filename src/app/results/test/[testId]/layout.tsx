
import type { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Test Result',
  description: 'Review your detailed test performance and results.',
};

export default function TestResultLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
