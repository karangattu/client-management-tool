import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function ClientsLoading() {
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="h-16 bg-white border-b">
                <div className="container flex items-center h-full px-4">
                    <Skeleton className="h-6 w-24" />
                </div>
            </div>

            <main className="container px-4 py-6">
                {/* Header Skeleton */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <Skeleton className="h-8 w-40 mb-2" />
                        <Skeleton className="h-4 w-60" />
                    </div>
                    <div className="flex gap-2">
                        <Skeleton className="h-10 w-24" />
                        <Skeleton className="h-10 w-28" />
                    </div>
                </div>

                {/* Stats Cards Skeleton */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i}>
                            <CardContent className="p-4">
                                <Skeleton className="h-8 w-12 mb-1" />
                                <Skeleton className="h-4 w-16" />
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Filters Skeleton */}
                <div className="flex gap-2 mb-6">
                    <Skeleton className="h-10 flex-1" />
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-32" />
                </div>

                {/* Client List Skeleton */}
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <Card key={i}>
                            <CardContent className="p-4 sm:p-6">
                                <div className="flex items-center gap-4">
                                    <Skeleton className="h-12 w-12 rounded-full" />
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Skeleton className="h-5 w-32" />
                                            <Skeleton className="h-5 w-16 rounded-full" />
                                        </div>
                                        <div className="flex gap-4">
                                            <Skeleton className="h-4 w-40" />
                                            <Skeleton className="h-4 w-28" />
                                        </div>
                                    </div>
                                    <Skeleton className="h-8 w-8" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </main>
        </div>
    );
}
