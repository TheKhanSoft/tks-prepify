
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { fetchPapers } from '@/lib/paper-service';
import { fetchCategories } from '@/lib/category-service';
import { getDescendantCategoryIds } from '@/lib/category-helpers';
import { ArrowRight, Folder, FileText } from 'lucide-react';

export default async function CategoriesPage() {
  const [allTopLevelCategories, allPapers] = await Promise.all([
    fetchCategories(),
    fetchPapers(),
  ]);

  return (
    <div className="container mx-auto px-16 py-16 md:py-24">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold font-headline">Browse All Categories</h1>
        <p className="text-lg text-muted-foreground mt-2">Find question papers tailored to your subjects of interest.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {allTopLevelCategories.length > 0 ? (
          allTopLevelCategories.map((category) => {
            const paperCount = allPapers.filter(p => getDescendantCategoryIds(category.id, allTopLevelCategories).includes(p.categoryId) && p.published).length;
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
              <p>No categories available at the moment. Check back soon!</p>
            </div>
        )}
      </div>
    </div>
  );
}
