
import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { fetchSettings } from '@/lib/settings-service';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await fetchSettings();
  return {
    title: {
      default: settings.siteName,
      template: `%s | ${settings.siteName}`,
    },
    description: settings.siteDescription,
  };
}

export default function HomeLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
