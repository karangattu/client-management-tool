import { describe, expect, it } from "vitest";
import {
  CLIENT_STATUS_CONFIG,
  DOCUMENT_STATUS_CONFIG,
  HOUSING_STATUS_CONFIG,
  TASK_PRIORITY_CONFIG,
  TASK_STATUS_CONFIG,
  getClientStatusConfig,
  getHousingStatusConfig,
  getStatusConfig,
  getTaskPriorityConfig,
  getTaskStatusConfig,
} from "../status-config";

describe("status-config", () => {
  it("contains expected canonical status labels", () => {
    expect(CLIENT_STATUS_CONFIG.active.label).toBe("Active");
    expect(TASK_STATUS_CONFIG.in_progress.label).toBe("In Progress");
    expect(TASK_PRIORITY_CONFIG.urgent.label).toBe("Urgent");
    expect(HOUSING_STATUS_CONFIG.at_risk.label).toBe("At Risk");
    expect(DOCUMENT_STATUS_CONFIG.verified.label).toBe("Verified");
  });

  it("returns configured status values for known statuses", () => {
    expect(getClientStatusConfig("pending")).toEqual(CLIENT_STATUS_CONFIG.pending);
    expect(getTaskStatusConfig("overdue")).toEqual(TASK_STATUS_CONFIG.overdue);
    expect(getTaskPriorityConfig("low")).toEqual(TASK_PRIORITY_CONFIG.low);
    expect(getHousingStatusConfig("housed")).toEqual(HOUSING_STATUS_CONFIG.housed);
  });

  it("returns default fallback styling and readable labels for unknown statuses", () => {
    const fallback = getTaskStatusConfig("needs_review");
    expect(fallback.label).toBe("needs review");
    expect(fallback.classes).toBe("bg-gray-100 text-gray-800 border-gray-200");
    expect(fallback.iconColor).toBe("text-gray-600");
  });

  it("supports explicit fallback labels in generic helper", () => {
    const custom = getStatusConfig(TASK_STATUS_CONFIG, "non_standard", "Custom Label");
    expect(custom.label).toBe("Custom Label");
    expect(custom.classes).toBe("bg-gray-100 text-gray-800 border-gray-200");
  });
});
