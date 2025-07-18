
import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { getPlanById } from '@/lib/plan-service';

export async function generateMetadata({ params }: { params: { planId: string } }): Promise<Metadata> {
  const plan = await getPlanById(params.planId);

  if (!plan) {
    return {
      title: 'Checkout',
    };
  }

  return {
    title: `Checkout - ${plan.name}`,
    description: `Complete your purchase for the ${plan.name} plan.`,
  };
}

export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
