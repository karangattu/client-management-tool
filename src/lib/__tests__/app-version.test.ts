import { describe, expect, it } from "vitest";
import pkg from "../../../package.json";

describe("app-version", () => {
  it("has a valid semantic version in package.json", () => {
    expect(pkg.version).toBeDefined();
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/);
  });

  it("exposes version matching package.json", () => {
    expect(pkg.version).toBe("1.0.14");
  });
});
