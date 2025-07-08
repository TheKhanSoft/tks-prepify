
import { fetchHelpArticles, fetchHelpCategories } from "@/lib/help-service";
import type { HelpArticle, HelpCategory } from "@/types";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import ReactMarkdown from 'react-markdown';
import { notFound } from "next/navigation";

export default async function HelpPage() {
    const [categories, articles] = await Promise.all([
        fetchHelpCategories(),
        fetchHelpArticles()
    ]);

    if (!categories || !articles) {
        notFound();
    }

    const articlesByCategoryId: { [key: string]: HelpArticle[] } = {};
    articles.forEach(article => {
        if (!articlesByCategoryId[article.categoryId]) {
            articlesByCategoryId[article.categoryId] = [];
        }
        articlesByCategoryId[article.categoryId].push(article);
    });

    // Sort articles by the order property
    for (const catId in articlesByCategoryId) {
        articlesByCategoryId[catId].sort((a,b) => a.order - b.order);
    }
    
    return (
        <div className="container mx-auto px-6 sm:px-10 lg:px-16 py-12 md:py-16">
            <div className="text-center mb-12">
                <h1 className="text-4xl md:text-5xl font-bold font-headline">Help Center</h1>
                <p className="text-lg text-muted-foreground mt-2">Find answers to frequently asked questions.</p>
            </div>
            
            <div className="max-w-4xl mx-auto">
                <Accordion type="multiple" className="w-full space-y-4">
                    {categories.map(category => {
                        const categoryArticles = articlesByCategoryId[category.id];
                        if (!categoryArticles || categoryArticles.length === 0) return null;

                        return (
                            <div key={category.id} className="border-b">
                                <h2 className="text-2xl font-bold mt-8 mb-4">{category.name}</h2>
                                {categoryArticles.map(article => (
                                     <AccordionItem value={article.id} key={article.id}>
                                        <AccordionTrigger className="text-left text-lg hover:no-underline">
                                            {article.question}
                                        </AccordionTrigger>
                                        <AccordionContent className="prose dark:prose-invert max-w-none pt-2 text-base">
                                            <ReactMarkdown>{article.answer}</ReactMarkdown>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </div>
                        )
                    })}
                </Accordion>
            </div>
        </div>
    )
}
