
import type { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Contact Us',
};

export default function ContactLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
