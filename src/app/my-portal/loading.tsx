import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function MyPortalLoading() {
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="h-16 bg-white border-b">
                <div className="container flex items-center justify-between h-full px-4">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-8 w-20" />
                </div>
            </div>

            <main className="container px-4 py-6 max-w-4xl mx-auto">
                {/* Welcome Header Skeleton */}
                <div className="mb-6">
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-4 w-72" />
                </div>

                {/* Progress Card Skeleton */}
                <Card className="mb-6">
                    <CardHeader>
                        <Skeleton className="h-6 w-36" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-4 w-full mb-4" />
                        <div className="space-y-2">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <Skeleton className="h-5 w-5 rounded-full" />
                                    <Skeleton className="h-4 w-48" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Tasks Card Skeleton */}
                <Card className="mb-6">
                    <CardHeader>
                        <Skeleton className="h-6 w-24" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {[1, 2].map((i) => (
                                <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="h-10 w-10 rounded-lg" />
                                        <div>
                                            <Skeleton className="h-5 w-32 mb-1" />
                                            <Skeleton className="h-4 w-24" />
                                        </div>
                                    </div>
                                    <Skeleton className="h-9 w-24" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Documents Card Skeleton */}
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-28" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {[1, 2].map((i) => (
                                <div key={i} className="flex items-center justify-between p-2 border rounded">
                                    <div className="flex items-center gap-2">
                                        <Skeleton className="h-8 w-8" />
                                        <Skeleton className="h-4 w-40" />
                                    </div>
                                    <Skeleton className="h-8 w-16" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
