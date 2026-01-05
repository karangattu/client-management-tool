'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error);
    }, [error]);

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-8 text-center text-gray-900 dark:bg-gray-900 dark:text-gray-100">
            <div className="space-y-4">
                <h2 className="text-3xl font-bold tracking-tight">Something went wrong!</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                    We apologize for the inconvenience. An unexpected error has occurred.
                </p>
                <div className="flex justify-center gap-4">
                    <Button
                        onClick={
                            // Attempt to recover by trying to re-render the segment
                            () => reset()
                        }
                    >
                        Try again
                    </Button>
                    <Button variant="outline" onClick={() => window.location.href = '/'}>
                        Go to Home
                    </Button>
                </div>
            </div>
        </div>
    );
}
