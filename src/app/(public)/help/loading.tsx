import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function HelpLoading() {
  return (
    <div className="container mx-auto max-w-7xl px-6 py-12 md:py-16">
      <div className="text-center mb-12">
        <Skeleton className="h-12 w-1/2 mx-auto" />
        <Skeleton className="h-6 w-3/4 mx-auto mt-4" />
      </div>

      <div className="mb-8 max-w-2xl mx-auto">
        <Skeleton className="h-12 w-full" />
      </div>

      <div className="grid md:grid-cols-4 gap-8 items-start">
        <div className="hidden md:block md:col-span-1">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-2/3" />
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-3 space-y-8">
            <Card>
                <CardHeader>
                     <Skeleton className="h-8 w-1/3" />
                </CardHeader>
                <CardContent className="space-y-4">
                     <Skeleton className="h-10 w-full" />
                     <Skeleton className="h-10 w-full" />
                     <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
