/**
 * Lazy-loaded confetti utility
 * Reduces initial bundle size by dynamically importing canvas-confetti only when needed
 */

// Type for confetti options
interface ConfettiOptions {
  particleCount?: number;
  angle?: number;
  spread?: number;
  startVelocity?: number;
  decay?: number;
  gravity?: number;
  drift?: number;
  ticks?: number;
  origin?: {
    x?: number;
    y?: number;
  };
  colors?: string[];
  shapes?: Array<'square' | 'circle'>;
  scalar?: number;
  zIndex?: number;
  disableForReducedMotion?: boolean;
}

type ConfettiFunction = (options?: ConfettiOptions) => Promise<null> | null;

let confettiModule: ConfettiFunction | null = null;

export async function triggerConfetti(options?: ConfettiOptions): Promise<null | void> {
  // Lazy load canvas-confetti only when triggered
  if (!confettiModule) {
    const module = await import('canvas-confetti');
    confettiModule = (module.default || module) as ConfettiFunction;
  }
  
  if (confettiModule) {
    return confettiModule(options);
  }
}

/**
 * Celebration confetti with default settings
 */
export async function celebrateSuccess(): Promise<null | void> {
  return triggerConfetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 }
  });
}
