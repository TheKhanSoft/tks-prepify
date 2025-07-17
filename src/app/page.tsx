
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { fetchPapers } from '@/lib/paper-service';
import { fetchCategories } from '@/lib/category-service';
import { fetchSettings } from '@/lib/settings-service';
import { getDescendantCategoryIds, getCategoryById } from '@/lib/category-helpers';
import { ArrowRight, FileText, Folder } from 'lucide-react';
import Image from 'next/image';
import type { Category } from '@/types';
import { PaperCard } from '@/components/common/PaperCard';
import ReactMarkdown from 'react-markdown';
import { Header } from '@/components/common/Header';
import { Footer } from '@/components/common/Footer';

// Helper function to recursively find all featured categories from the tree
function getAllFeaturedCategories(categories: Category[]): Category[] {
  let featured: Category[] = [];
  for (const category of categories) {
    if (category.featured) {
      featured.push(category);
    }
    if (category.subcategories && category.subcategories.length > 0) {
      featured = featured.concat(getAllFeaturedCategories(category.subcategories));
    }
  }
  return featured;
}


export default async function Home() {
  const [allCategories, allPapers, settings] = await Promise.all([
    fetchCategories(),
    fetchPapers(),
    fetchSettings()
  ]);

  const featuredCategories = getAllFeaturedCategories(allCategories).slice(0, 4);
  const featuredPapers = allPapers.filter(p => p.featured && p.published).slice(0, 3);
  
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header settings={settings} />
      <main className="flex-grow">
      {/* Hero Section */}
      <section className="bg-card">
        <div className="container mx-auto px-6 sm:px-10 lg:px-16 py-16 md:py-24 grid md:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold font-headline leading-tight">
              {settings.heroTitlePrefix} <span className="text-primary">{settings.heroTitleHighlight}</span> {settings.heroTitleSuffix}
            </h1>
            <div className="prose prose-lg dark:prose-invert max-w-none text-muted-foreground">
              <ReactMarkdown>{settings.heroSubtitle || ''}</ReactMarkdown>
            </div>
            <div className="flex gap-4">
              <Button size="lg" asChild>
                <Link href={settings.heroButton1Link || '#'}>{settings.heroButton1Text}</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href={settings.heroButton2Link || '#'}>{settings.heroButton2Text}</Link>
              </Button>
            </div>
          </div>
          <div>
            <Image
              src={settings.heroImage || "https://placehold.co/600x400.png"}
              alt="Student studying"
              data-ai-hint="student studying"
              width={600}
              height={400}
              className="rounded-lg shadow-xl"
            />
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section id="categories" className="container mx-auto px-6 sm:px-10 lg:px-16 py-16 md:py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold font-headline">Explore Featured Categories</h2>
          <p className="text-lg text-muted-foreground mt-2">Find question papers tailored to your subjects of interest.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {featuredCategories.length > 0 ? (
            featuredCategories.map((category) => {
              const paperCount = allPapers.filter(p => getDescendantCategoryIds(category.id, allCategories).includes(p.categoryId) && p.published).length;
              const subCategoryCount = category.subcategories?.length || 0;

              return (
                <Link key={category.id} href={`/categories/${category.slug}`} className="group">
                  <Card className="hover:shadow-lg hover:-translate-y-1 transition-transform duration-300 h-full hover:border-primary">
                    <CardContent className="p-6 flex flex-col h-full">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-semibold pr-2">{category.name}</h3>
                        <Folder className="w-7 h-7 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                      </div>
                      <div className="space-y-2 text-sm text-muted-foreground flex-grow">
                        {subCategoryCount > 0 && (
                          <div className="flex items-center gap-2">
                            <Folder className="w-4 h-4" />
                            <span>{subCategoryCount} Sub-categor{subCategoryCount > 1 ? 'ies' : 'y'}</span>
                          </div>
                        )}
                        {paperCount > 0 && (
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            <span>{paperCount} Paper{paperCount > 1 ? 's' : ''}</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-auto pt-4">
                        <div className="flex items-center font-semibold text-primary">
                          Explore Category
                          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })
          ) : (
            <div className="col-span-full text-center text-muted-foreground py-8">
              <p>No featured categories available at the moment. Check back soon!</p>
            </div>
          )}
        </div>
        <div className="text-center mt-12">
          <Button asChild size="lg" variant="outline">
              <Link href="/categories">
                  Browse All Categories
                  <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
          </Button>
        </div>
      </section>

      {/* Latest Papers Section */}
      <section className="bg-card">
        <div className="container mx-auto px-6 sm:px-10 lg:px-16 py-16 md:py-24">
          <div className="flex justify-between items-center mb-12">
            <div className="text-left">
              <h2 className="text-3xl md:text-4xl font-bold font-headline">Latest Question Papers</h2>
              <p className="text-lg text-muted-foreground mt-2">Jump into the latest papers added to our collection.</p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/papers">View All <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredPapers.map((paper) => {
              const category = getCategoryById(paper.categoryId, allCategories);
              return (
                <PaperCard key={paper.id} paper={paper} categoryName={category?.name} />
              )
            })}
          </div>
        </div>
      </section>
      </main>
      <Footer settings={settings} />
    </div>
  );
}
