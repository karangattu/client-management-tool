import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ClientHub - Client Management System',
    short_name: 'ClientHub',
    description: 'A comprehensive client intake and management system for case managers, social workers, and service providers.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#2563eb',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    categories: ['business', 'productivity'],
    lang: 'en',
    dir: 'ltr',
    screenshots: [
      {
        src: '/screenshot-1.png',
        sizes: '540x720',
        form_factor: 'narrow',
        type: 'image/png',
      },
      {
        src: '/screenshot-2.png',
        sizes: '1280x720',
        form_factor: 'wide',
        type: 'image/png',
      },
    ],
  };
}
