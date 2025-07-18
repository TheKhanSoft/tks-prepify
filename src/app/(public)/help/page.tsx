
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { fetchHelpArticles, fetchHelpCategories } from "@/lib/help-service";
import type { HelpArticle, HelpCategory } from "@/types";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, HelpCircle, LifeBuoy } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export default function HelpPage() {
    const [categories, setCategories] = useState<HelpCategory[]>([]);
    const [articles, setArticles] = useState<HelpArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategoryId, setActiveCategoryId] = useState<string | 'all'>('all');

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const [cats, arts] = await Promise.all([
                    fetchHelpCategories(),
                    fetchHelpArticles()
                ]);
                setCategories(cats);
                setArticles(arts);
            } catch (error) {
                // console.error("Failed to load help center data:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const filteredArticles = useMemo(() => {
        return articles
            .filter(article => {
                const matchesCategory = activeCategoryId === 'all' || article.categoryId === activeCategoryId;
                const matchesSearch = searchTerm === '' ||
                    article.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    article.answer.toLowerCase().includes(searchTerm.toLowerCase());
                return matchesCategory && matchesSearch;
            })
            .sort((a, b) => a.order - b.order);
    }, [articles, searchTerm, activeCategoryId]);

    const articlesByCategory = useMemo(() => {
        const grouped: { [key: string]: HelpArticle[] } = {};
        filteredArticles.forEach(article => {
            const categoryId = article.categoryId || 'uncategorized';
            if (!grouped[categoryId]) {
                grouped[categoryId] = [];
            }
            grouped[categoryId].push(article);
        });
        return grouped;
    }, [filteredArticles]);

    const displayedCategories = useMemo(() => {
        const categoryIdsInFilteredArticles = new Set(filteredArticles.map(a => a.categoryId));
        return categories.filter(c => categoryIdsInFilteredArticles.has(c.id));
    }, [filteredArticles, categories]);

    const Sidebar = () => (
        <aside className="md:col-span-1 md:sticky top-24">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Topics</CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-auto">
                        <div className="space-y-2">
                             <Button
                                variant={activeCategoryId === 'all' ? 'secondary' : 'ghost'}
                                className="w-full justify-start"
                                onClick={() => setActiveCategoryId('all')}
                            >
                                All Topics
                            </Button>
                            {categories.map(category => (
                                <Button
                                    key={category.id}
                                    variant={activeCategoryId === category.id ? 'secondary' : 'ghost'}
                                    className="w-full justify-start"
                                    onClick={() => setActiveCategoryId(category.id)}
                                >
                                    {category.name}
                                </Button>
                            ))}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </aside>
    );

    return (
        <div className="container mx-auto max-w-7xl px-6 py-12 md:py-16">
            <div className="text-center mb-12">
                <LifeBuoy className="h-16 w-16 mx-auto text-primary" />
                <h1 className="text-4xl md:text-5xl font-bold font-headline mt-4">Help Center</h1>
                <p className="text-lg text-muted-foreground mt-2">How can we help you today?</p>
            </div>

            <div className="relative mb-8 max-w-2xl mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    placeholder="Search articles..."
                    className="pl-12 h-14 text-lg"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            <div className="grid md:grid-cols-4 gap-8 items-start">
                <Sidebar />
                <div className="md:col-span-3 space-y-8">
                    {filteredArticles.length === 0 && !loading && (
                        <Card className="text-center py-16">
                            <CardContent>
                                <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground" />
                                <h3 className="text-xl font-semibold mt-4">No Articles Found</h3>
                                <p className="text-muted-foreground mt-2">Try adjusting your search or selecting a different category.</p>
                            </CardContent>
                        </Card>
                    )}
                    {Object.entries(articlesByCategory).map(([categoryId, articles]) => {
                        const category = categories.find(c => c.id === categoryId);
                        if (!articles || articles.length === 0) return null;

                        return (
                            <div key={categoryId}>
                                <h2 className="text-2xl font-bold mb-4">{category?.name || 'Other'}</h2>
                                 <Card>
                                    <CardContent className="p-2">
                                        <Accordion type="single" collapsible className="w-full">
                                            {articles.map(article => (
                                                <AccordionItem value={article.id} key={article.id} className="border-b-0">
                                                    <AccordionTrigger className="text-left text-base font-semibold hover:no-underline p-4">
                                                        {article.question}
                                                    </AccordionTrigger>
                                                    <AccordionContent className="prose dark:prose-invert max-w-none p-4 pt-0 text-base">
                                                        <ReactMarkdown>{article.answer}</ReactMarkdown>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            ))}
                                        </Accordion>
                                    </CardContent>
                                 </Card>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
}
