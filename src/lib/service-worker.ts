/**
 * Service Worker Registration Utility
 * Handles registration and lifecycle management of the service worker
 */

/**
 * Register the service worker
 * Should be called once on app initialization (client-side only)
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  // Check if service workers are supported
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('Service Workers are not supported in this browser');
    return null;
  }

  try {
    // Wait for the page to load before registering
    if (document.readyState === 'loading') {
      await new Promise((resolve) => {
        window.addEventListener('load', resolve, { once: true });
      });
    }

    console.log('Registering Service Worker...');
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('Service Worker registered successfully:', registration.scope);

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      console.log('New Service Worker found, installing...');

      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('New Service Worker available, prompting user to update...');
            
            // Show update notification to user
            if (window.confirm('A new version is available. Reload to update?')) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
              window.location.reload();
            }
          }
        });
      }
    });

    // Handle controller change (new service worker activated)
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Unregister all service workers
 * Useful for debugging or disabling offline mode
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const result = await registration.unregister();
      console.log('Service Worker unregistered:', result);
      return result;
    }
    return false;
  } catch (error) {
    console.error('Service Worker unregistration failed:', error);
    return false;
  }
}

/**
 * Check if the app is currently offline
 */
export function isOffline(): boolean {
  return typeof window !== 'undefined' && !navigator.onLine;
}

/**
 * Request background sync for offline operations
 * @param tag Sync tag identifier
 */
export async function requestBackgroundSync(tag: string): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    throw new Error('Service Workers not supported');
  }

  const registration = await navigator.serviceWorker.ready;
  
  // Check if Background Sync is supported
  if ('sync' in registration) {
    try {
      await (registration as any).sync.register(tag);
      console.log('Background sync registered:', tag);
    } catch (error) {
      console.error('Background sync registration failed:', error);
      throw error;
    }
  } else {
    console.warn('Background Sync not supported');
    throw new Error('Background Sync not supported');
  }
}

/**
 * Send a message to the service worker
 */
export async function sendMessageToSW(message: any): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  if (registration.active) {
    registration.active.postMessage(message);
  }
}

/**
 * Clear all caches
 */
export async function clearAllCaches(): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  await sendMessageToSW({ type: 'CLEAR_CACHE' });
  
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
    console.log('All caches cleared');
  }
}

/**
 * Hook to use in React components for online/offline status
 */
export function useOnlineStatus() {
  if (typeof window === 'undefined') {
    return true;
  }

  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

// React import for the hook
import React from 'react';
