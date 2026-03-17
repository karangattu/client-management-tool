import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getPacificNow } from "@/lib/date-utils";
import {
  calculateAge,
  cn,
  formatPhoneNumber,
  formatSSN,
  formatZipCode,
  generateClientId,
  getAppUrl,
  maskSSN,
} from "../utils";

vi.mock("@/lib/date-utils", () => ({
  getPacificNow: vi.fn(),
}));

const mockedGetPacificNow = vi.mocked(getPacificNow);
const ORIGINAL_ENV = process.env;

describe("utils", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it("merges class names with Tailwind precedence", () => {
    const merged = cn("p-2 text-sm", "p-4");
    expect(merged).toContain("p-4");
    expect(merged).toContain("text-sm");
    expect(merged).not.toContain("p-2");
  });

  it("formats phone numbers across short and full values", () => {
    expect(formatPhoneNumber("12a3")).toBe("123");
    expect(formatPhoneNumber("123456")).toBe("(123) 456");
    expect(formatPhoneNumber("1234567890")).toBe("(123) 456-7890");
    expect(formatPhoneNumber("1234567890123")).toBe("(123) 456-7890");
  });

  it("formats and masks SSNs", () => {
    expect(formatSSN("12a3")).toBe("123");
    expect(formatSSN("12345")).toBe("123-45");
    expect(formatSSN("123456789")).toBe("123-45-6789");
    expect(maskSSN("")).toBe("");
    expect(maskSSN("12")).toBe("***-**-****");
    expect(maskSSN("123456789")).toBe("***-**-6789");
  });

  it("formats ZIP code and truncates extra digits", () => {
    expect(formatZipCode("95a112")).toBe("95112");
    expect(formatZipCode("951121234")).toBe("95112-1234");
    expect(formatZipCode("95112123499")).toBe("95112-1234");
  });

  it("calculates age from Pacific current date", () => {
    mockedGetPacificNow.mockReturnValue(new Date("2026-06-15T12:00:00.000Z"));
    expect(calculateAge(new Date("2000-06-14T00:00:00.000Z"))).toBe(26);
    expect(calculateAge(new Date("2000-12-01T00:00:00.000Z"))).toBe(25);
  });

  it("generates uppercase client IDs with expected shape", () => {
    vi.spyOn(Date, "now").mockReturnValue(1712345678901);
    vi.spyOn(Math, "random").mockReturnValue(0.123456789);

    const id = generateClientId();

    expect(id).toMatch(/^CLT-[A-Z0-9]+-[A-Z0-9]{6}$/);
    expect(id).toBe(id.toUpperCase());
  });

  it("resolves app URL from env vars with expected precedence", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
    process.env.VERCEL_URL = "preview.example.vercel.app";
    expect(getAppUrl()).toBe("https://app.example.com");

    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(getAppUrl()).toBe("https://preview.example.vercel.app");

    delete process.env.VERCEL_URL;
    expect(getAppUrl()).toBe("http://localhost:3000");
  });
});
