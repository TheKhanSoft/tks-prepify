
import type { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'All Papers',
};

export default function PapersLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
