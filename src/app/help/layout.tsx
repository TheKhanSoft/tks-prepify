
import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { fetchSettings } from '@/lib/settings-service';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await fetchSettings();
  return {
    title: 'Help Center',
    description: `Find answers to your questions about ${settings.siteName}.`,
  };
}

export default function HelpLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
