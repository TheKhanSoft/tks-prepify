
import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { fetchSettings } from '@/lib/settings-service';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await fetchSettings();
  return {
    title: 'Pricing Plans',
    description: `Choose the perfect plan on ${settings.siteName} to unlock your potential and ace your exams.`,
  };
}

export default function PricingLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
