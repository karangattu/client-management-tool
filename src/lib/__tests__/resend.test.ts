import { afterEach, describe, expect, it, vi } from "vitest";

const resendCtor = vi.fn();

vi.mock("resend", () => ({
  Resend: vi.fn((key?: string) => {
    resendCtor(key);
    return { key };
  }),
}));

describe("resend module", () => {
  const originalApiKey = process.env.RESEND_API_KEY;

  afterEach(() => {
    process.env.RESEND_API_KEY = originalApiKey;
    resendCtor.mockClear();
    vi.resetModules();
  });

  it("constructs Resend with RESEND_API_KEY when set", async () => {
    process.env.RESEND_API_KEY = "test-key";
    const { resend } = await import("../resend");

    expect(resendCtor).toHaveBeenCalledWith("test-key");
    expect(resend).toEqual({ key: "test-key" });
  });

  it("still constructs Resend when RESEND_API_KEY is undefined", async () => {
    delete process.env.RESEND_API_KEY;
    const { resend } = await import("../resend");

    expect(resendCtor).toHaveBeenCalledWith(undefined);
    expect(resend).toEqual({ key: undefined });
  });
});
