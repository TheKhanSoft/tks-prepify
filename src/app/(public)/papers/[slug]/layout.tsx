
import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { getPaperBySlug } from '@/lib/paper-service';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const paper = await getPaperBySlug(params.slug);

  if (!paper) {
    return {
      title: 'Paper Not Found',
    };
  }

  return {
    title: paper.metaTitle || paper.title,
    description: paper.metaDescription || paper.description,
    keywords: paper.keywords,
  };
}


export default function PaperLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
