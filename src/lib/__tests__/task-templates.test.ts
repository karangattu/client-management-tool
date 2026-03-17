import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPacificNow } from "@/lib/date-utils";
import {
  TASK_TEMPLATES,
  calculateDueDate,
  getCategoryLabel,
  getTemplateById,
  getTemplatesByCategory,
} from "../task-templates";

vi.mock("@/lib/date-utils", () => ({
  getPacificNow: vi.fn(),
}));

const mockedGetPacificNow = vi.mocked(getPacificNow);

describe("task templates", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockedGetPacificNow.mockReturnValue(new Date("2026-03-10T12:00:00.000Z"));
  });

  it("groups templates by category and includes all templates", () => {
    const grouped = getTemplatesByCategory();
    const groupedCount = Object.values(grouped).reduce(
      (count, templates) => count + templates.length,
      0
    );

    expect(groupedCount).toBe(TASK_TEMPLATES.length);
    expect(grouped.intake.length).toBeGreaterThan(0);
    expect(grouped.administrative.length).toBeGreaterThan(0);
  });

  it("returns user-friendly category labels with fallback", () => {
    expect(getCategoryLabel("benefits")).toBe("Benefits & Services");
    expect(getCategoryLabel("not-mapped")).toBe("not-mapped");
  });

  it("calculates due date from default due days", () => {
    const template = TASK_TEMPLATES.find((item) => item.id === "report-submission");
    expect(template).toBeDefined();

    const dueDate = calculateDueDate(template!);
    expect(dueDate).toBe("2026-03-15");
  });

  it("finds templates by id and returns undefined for unknown ids", () => {
    expect(getTemplateById("initial-assessment")?.name).toBe("Initial Assessment");
    expect(getTemplateById("does-not-exist")).toBeUndefined();
  });
});
