
import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { getTestConfigBySlug } from '@/lib/test-config-service';

export async function generateMetadata({ params }: { params: { configId: string } }): Promise<Metadata> {
  const config = await getTestConfigBySlug(params.configId);

  if (!config) {
    return {
      title: 'Test Not Found',
    };
  }

  return {
    title: config.name,
    description: config.description,
  };
}

export default function TestConfigLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
