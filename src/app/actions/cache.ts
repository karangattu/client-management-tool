import { unstable_cache } from 'next/cache';

export function cacheReadOnly<T extends (...args: any[]) => Promise<unknown>>(
  fn: T,
  keyParts: string[],
  revalidateSeconds = 60
) {
  return unstable_cache(fn, keyParts, { revalidate: revalidateSeconds });
}
