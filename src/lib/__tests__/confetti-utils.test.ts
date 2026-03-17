import { afterEach, describe, expect, it, vi } from "vitest";

describe("confetti-utils", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    vi.doUnmock("canvas-confetti");
  });

  it("lazy-loads canvas-confetti and reuses module for subsequent calls", async () => {
    const confettiFn = vi.fn().mockResolvedValue(null);
    vi.doMock("canvas-confetti", () => ({ default: confettiFn }));

    const { triggerConfetti } = await import("../confetti-utils");

    await triggerConfetti({ particleCount: 10 });
    await triggerConfetti({ spread: 20 });

    expect(confettiFn).toHaveBeenCalledTimes(2);
    expect(confettiFn).toHaveBeenNthCalledWith(1, { particleCount: 10 });
    expect(confettiFn).toHaveBeenNthCalledWith(2, { spread: 20 });
  });

  it("returns early and logs when imported module is not a function", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.doMock("canvas-confetti", () => ({ default: { bad: true } }));

    const { triggerConfetti } = await import("../confetti-utils");
    const result = await triggerConfetti({ particleCount: 1 });

    expect(result).toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith("Failed to load confetti module correctly");
  });

  it("handles dynamic import failures without throwing", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.doMock("canvas-confetti", () => {
      throw new Error("load failed");
    });

    const { triggerConfetti } = await import("../confetti-utils");
    await expect(triggerConfetti()).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to load canvas-confetti:",
      expect.any(Error)
    );
  });

  it("celebrateSuccess triggers confetti with the default payload", async () => {
    const confettiFn = vi.fn().mockResolvedValue(null);
    vi.doMock("canvas-confetti", () => ({ default: confettiFn }));

    const { celebrateSuccess } = await import("../confetti-utils");
    await celebrateSuccess();

    expect(confettiFn).toHaveBeenCalledWith({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  });
});
