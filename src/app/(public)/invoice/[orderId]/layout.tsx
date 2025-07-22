
import type { Metadata } from 'next';
import { ReactNode } from 'react';

export async function generateMetadata({ params }: { params: { orderId: string } }): Promise<Metadata> {
  return {
    title: `Invoice #${params.orderId}`,
    description: `View details for invoice #${params.orderId}.`,
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default function InvoiceLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
