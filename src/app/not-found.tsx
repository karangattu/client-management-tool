'use client';

import Link from 'next/link';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/button';
import { Home, Search } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <AppHeader title="Page Not Found" showBackButton />

            <main className="flex-1 flex items-center justify-center p-4">
                <div className="max-w-md w-full text-center">
                    <div className="mb-6 flex justify-center">
                        <div className="h-24 w-24 rounded-full bg-blue-100 flex items-center justify-center">
                            <Search className="h-12 w-12 text-blue-600" />
                        </div>
                    </div>

                    <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">Page Not Found</h2>

                    <p className="text-gray-600 mb-8">
                        The page you are looking for doesn&apos;t exist or has been moved.
                        If you think this is a mistake, please contact support.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link href="/dashboard" className="w-full sm:w-auto">
                            <Button className="w-full gap-2">
                                <Home className="h-4 w-4" />
                                Go to Dashboard
                            </Button>
                        </Link>
                        <Button
                            variant="outline"
                            className="w-full sm:w-auto"
                            onClick={() => window.history.back()}
                        >
                            Go Back
                        </Button>
                    </div>
                </div>
            </main>

            <footer className="py-6 text-center text-sm text-gray-500">
                &copy; {new Date().getFullYear()} ClientHub. All rights reserved.
            </footer>
        </div>
    );
}
