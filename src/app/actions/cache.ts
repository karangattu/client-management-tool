import { unstable_cache } from 'next/cache';

export function cacheReadOnly<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  keyParts: string[],
  revalidateSeconds = 60
) {
  return unstable_cache(fn, keyParts, { revalidate: revalidateSeconds }) as (...args: TArgs) => Promise<TResult>;
}
