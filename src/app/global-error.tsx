'use client';

import { Inter } from "next/font/google";
import "./globals.css";
import { Button } from '@/components/ui/button';

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
});

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html lang="en">
            <body className={`${inter.variable} font-sans antialiased`}>
                <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-8 text-center text-gray-900 dark:bg-gray-900 dark:text-gray-100">
                    <div className="space-y-4">
                        <h2 className="text-3xl font-bold tracking-tight">System Error</h2>
                        <p className="text-muted-foreground max-w-md mx-auto">
                            A critical check failure occurred.
                        </p>
                        <Button onClick={() => reset()}>Try again</Button>
                    </div>
                </div>
            </body>
        </html>
    );
}
