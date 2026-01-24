/**
 * Image optimization utilities for Supabase storage
 * Reduces bandwidth and improves loading performance
 */

/**
 * Get an optimized image URL from Supabase storage
 * @param url Original Supabase storage URL
 * @param width Desired width in pixels
 * @param height Desired height in pixels (optional)
 * @param quality Image quality (1-100, default: 75)
 * @returns Optimized image URL with transformation parameters
 */
export function getOptimizedImageUrl(
  url: string,
  width: number,
  height?: number,
  quality: number = 75
): string {
  if (!url) return url;
  
  // Check if URL is from Supabase storage
  if (!url.includes('supabase.co/storage')) {
    return url;
  }

  // Build transformation parameters
  const params = new URLSearchParams();
  params.append('width', width.toString());
  if (height) {
    params.append('height', height.toString());
  }
  params.append('quality', quality.toString());
  params.append('resize', 'cover');

  return `${url}?${params.toString()}`;
}

/**
 * Get optimized avatar URL (32x32 by default)
 */
export function getOptimizedAvatarUrl(url: string, size: number = 32): string {
  return getOptimizedImageUrl(url, size, size, 75);
}

/**
 * Get optimized thumbnail URL (200x200 by default)
 */
export function getOptimizedThumbnailUrl(url: string, size: number = 200): string {
  return getOptimizedImageUrl(url, size, size, 80);
}
