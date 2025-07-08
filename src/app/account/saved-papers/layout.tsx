
import type { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Saved Papers',
  description: 'Access all your bookmarked papers for easy studying.',
};

export default function SavedPapersLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
