
import { getPageBySlug } from '@/lib/page-service';
import { Metadata } from 'next';

export const revalidate = 3600; // Revalidate every hour

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug('terms-of-service');
  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription,
  };
}

export default async function TermsOfServicePage() {
  const page = await getPageBySlug('terms-of-service');

  return (
    <div className="space-y-4">
      <h1 className="text-4xl font-bold font-headline">{page.title}</h1>
      <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
        {page.content}
      </div>
    </div>
  );
}
