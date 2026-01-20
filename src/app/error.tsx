'use client';

import { useEffect } from 'react';
import { ErrorRecovery } from '@/components/ui/error-recovery';
import { FileQuestion, RefreshCw } from 'lucide-react';

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

    // Determine helpful message based on error
    const getErrorInfo = () => {
        const message = error.message?.toLowerCase() || '';
        
        if (message.includes('network') || message.includes('fetch')) {
            return {
                title: 'Connection Problem',
                description: 'We couldn\'t connect to our servers. Check your internet connection and try again.',
            };
        }
        if (message.includes('unauthorized') || message.includes('401')) {
            return {
                title: 'Session Expired',
                description: 'Your session has expired. Please sign in again to continue.',
            };
        }
        if (message.includes('forbidden') || message.includes('403')) {
            return {
                title: 'Access Denied',
                description: 'You don\'t have permission to access this resource. Contact your administrator if you think this is a mistake.',
            };
        }
        if (message.includes('not found') || message.includes('404')) {
            return {
                title: 'Resource Not Found',
                description: 'The item you\'re looking for might have been moved or deleted.',
            };
        }
        return {
            title: 'Something Went Wrong',
            description: 'We encountered an unexpected error. Here are some things you can try:',
        };
    };

    const { title, description } = getErrorInfo();

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-8 dark:bg-gray-900">
            <ErrorRecovery
                title={title}
                description={description}
                errorCode={error.digest}
                onRetry={reset}
                actions={[
                    {
                        label: 'Clear Cache & Reload',
                        onClick: () => {
                            if ('caches' in window) {
                                caches.keys().then(names => {
                                    names.forEach(name => caches.delete(name));
                                });
                            }
                            window.location.reload();
                        },
                        icon: <RefreshCw className="h-4 w-4" />,
                        variant: 'outline',
                    },
                    {
                        label: 'Report This Issue',
                        href: `mailto:support@clienthub.org?subject=Error Report&body=Error: ${error.message || 'Unknown'}%0ACode: ${error.digest || 'N/A'}`,
                        icon: <FileQuestion className="h-4 w-4" />,
                        variant: 'ghost',
                    },
                ]}
            />
        </div>
    );
}
