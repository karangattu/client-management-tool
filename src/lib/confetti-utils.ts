/**
 * Lazy-loaded confetti utility
 * Reduces initial bundle size by dynamically importing canvas-confetti only when needed
 */

let confettiModule: typeof import('canvas-confetti') | null = null;

export async function triggerConfetti(options?: Parameters<typeof import('canvas-confetti')>[0]) {
  // Lazy load canvas-confetti only when triggered
  if (!confettiModule) {
    confettiModule = (await import('canvas-confetti')).default;
  }
  
  return confettiModule(options);
}

/**
 * Celebration confetti with default settings
 */
export async function celebrateSuccess() {
  return triggerConfetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 }
  });
}
