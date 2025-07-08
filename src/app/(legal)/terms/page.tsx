
import { getPageBySlug } from '@/lib/page-service';
import { Metadata } from 'next';
import ReactMarkdown from 'react-markdown';

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
      <div className="prose dark:prose-invert max-w-none">
        <ReactMarkdown>{page.content}</ReactMarkdown>
      </div>
    </div>
  );
}
