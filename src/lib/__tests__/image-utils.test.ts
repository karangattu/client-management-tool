import { describe, expect, it } from "vitest";
import {
  getOptimizedAvatarUrl,
  getOptimizedImageUrl,
  getOptimizedThumbnailUrl,
} from "../image-utils";

describe("image-utils", () => {
  const supabaseUrl =
    "https://waibklokngugagdgllve.supabase.co/storage/v1/object/public/profile-pictures/user.png";
  const externalUrl = "https://cdn.example.com/image.png";

  it("returns unchanged URL for empty and non-Supabase values", () => {
    expect(getOptimizedImageUrl("", 400)).toBe("");
    expect(getOptimizedImageUrl(externalUrl, 400, 300, 60)).toBe(externalUrl);
  });

  it("builds optimization parameters for Supabase URLs", () => {
    const url = getOptimizedImageUrl(supabaseUrl, 640, 360, 85);
    const parsed = new URL(url);

    expect(`${parsed.origin}${parsed.pathname}`).toBe(supabaseUrl);
    expect(parsed.searchParams.get("width")).toBe("640");
    expect(parsed.searchParams.get("height")).toBe("360");
    expect(parsed.searchParams.get("quality")).toBe("85");
    expect(parsed.searchParams.get("resize")).toBe("cover");
  });

  it("does not append height when height is omitted", () => {
    const url = getOptimizedImageUrl(supabaseUrl, 500);
    const parsed = new URL(url);

    expect(parsed.searchParams.get("width")).toBe("500");
    expect(parsed.searchParams.get("height")).toBeNull();
    expect(parsed.searchParams.get("quality")).toBe("75");
    expect(parsed.searchParams.get("resize")).toBe("cover");
  });

  it("uses expected presets for avatar and thumbnail helpers", () => {
    const avatar = new URL(getOptimizedAvatarUrl(supabaseUrl));
    expect(avatar.searchParams.get("width")).toBe("32");
    expect(avatar.searchParams.get("height")).toBe("32");
    expect(avatar.searchParams.get("quality")).toBe("75");

    const thumbnail = new URL(getOptimizedThumbnailUrl(supabaseUrl));
    expect(thumbnail.searchParams.get("width")).toBe("200");
    expect(thumbnail.searchParams.get("height")).toBe("200");
    expect(thumbnail.searchParams.get("quality")).toBe("80");
  });
});
