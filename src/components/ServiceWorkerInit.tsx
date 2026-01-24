'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/service-worker';

/**
 * Service Worker Initializer Component
 * Registers the service worker on mount (client-side only)
 */
export function ServiceWorkerInit() {
  useEffect(() => {
    // Only run in production or when explicitly enabled
    const isProduction = process.env.NODE_ENV === 'production';
    const enableSW = process.env.NEXT_PUBLIC_ENABLE_SW === 'true';
    
    if (isProduction || enableSW) {
      registerServiceWorker().catch((error) => {
        console.error('Failed to register service worker:', error);
      });
    }
  }, []);

  return null; // This component doesn't render anything
}
