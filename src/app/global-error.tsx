'use client';

import { Inter } from "next/font/google";
import "./globals.css";
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home, Mail } from 'lucide-react';

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
});

export default function GlobalError({
    reset,
}: {
    reset: () => void;
}) {
    return (
        <html lang="en">
            <body className={`${inter.variable} font-sans antialiased`}>
                <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-8 text-center text-gray-900 dark:bg-gray-900 dark:text-gray-100">
                    <div className="max-w-md w-full space-y-6">
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                            <AlertTriangle className="h-10 w-10 text-red-600 dark:text-red-400" />
                        </div>
                        
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight mb-2">System Error</h2>
                            <p className="text-muted-foreground">
                                A critical error occurred. This has been automatically reported to our team.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3">
                            <Button onClick={() => reset()} className="w-full gap-2">
                                <RefreshCw className="h-4 w-4" />
                                Try Again
                            </Button>
                            <Button 
                                variant="outline" 
                                onClick={() => window.location.href = '/dashboard'}
                                className="w-full gap-2"
                            >
                                <Home className="h-4 w-4" />
                                Go to Dashboard
                            </Button>
                            <Button 
                                variant="ghost" 
                                onClick={() => window.location.href = '/'}
                                className="w-full gap-2"
                            >
                                Start Over
                            </Button>
                        </div>

                        <div className="pt-4 border-t">
                            <a
                                href="mailto:support@clienthub.org?subject=Critical Error Report"
                                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400"
                            >
                                <Mail className="h-3 w-3" />
                                Contact Support
                            </a>
                        </div>
                    </div>
                </div>
            </body>
        </html>
    );
}
