'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Bookmark } from 'lucide-react';

export default function SavedPapersPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Saved Papers</h1>
                <p className="text-muted-foreground">All your bookmarked papers in one place for easy access.</p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Bookmarked Papers</CardTitle>
                    <CardDescription>Bookmark functionality is coming soon!</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-64 border-2 border-dashed rounded-lg">
                        <Bookmark className="h-12 w-12 mb-4" />
                        <h3 className="text-lg font-semibold">No Saved Papers</h3>
                        <p className="mt-1">You'll be able to save papers for later study.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
