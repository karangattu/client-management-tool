import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatPacificDate,
  formatPacificDateTime,
  formatPacificDateTimeFull,
  formatPacificDayAndMonth,
  formatPacificDayOfWeek,
  formatPacificDueDate,
  formatPacificFriendly,
  formatPacificFullDate,
  formatPacificLocaleDate,
  formatPacificLocaleDateTime,
  formatPacificLocaleTime,
  formatPacificRelative,
  formatPacificTime,
  formatPacificTimeRange,
  getPacificDayInfo,
  getPacificHour,
  getPacificNow,
  getPacificYear,
  pacificToUTCISO,
  toPacificDate,
} from "../date-utils";

function getPacificParts(iso: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date(iso));

  const map = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return {
    year: map.year,
    month: map.month,
    day: map.day,
    hour: map.hour,
    minute: map.minute,
  };
}

describe("date-utils", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T19:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("converts and exposes Pacific current time metadata", () => {
    const pacificNow = getPacificNow();

    expect(pacificNow).toBeInstanceOf(Date);
    expect(getPacificHour()).toBeGreaterThanOrEqual(0);
    expect(getPacificHour()).toBeLessThan(24);
    expect(getPacificYear()).toBe(2026);
  });

  it("formats locale date, time, and datetime in Pacific timezone", () => {
    const iso = "2026-06-15T19:00:00.000Z";
    expect(formatPacificLocaleDate(iso)).toBe("6/15/2026");
    expect(formatPacificLocaleTime(iso, { hour: "2-digit", minute: "2-digit" })).toMatch(
      /^\d{1,2}:\d{2}\s[AP]M$/
    );
    expect(
      formatPacificLocaleDateTime(iso, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    ).toContain("06/15/2026");
  });

  it("returns consistent day info and full-date labels", () => {
    const info = getPacificDayInfo();
    expect(info.weekday).toBe("Monday");
    expect(info.month).toBe("June");
    expect(info.day).toBe("15");
    expect(info.year).toBe("2026");

    expect(formatPacificFullDate()).toBe("Monday, June 15, 2026");
    expect(formatPacificFullDate("2026-06-16T08:00:00.000Z")).toBe("Tuesday, June 16, 2026");
  });

  it("converts Pacific date/time input to UTC ISO while preserving Pacific wall time", () => {
    const converted = pacificToUTCISO("2026-10-12", "14:45");
    const parts = getPacificParts(converted);

    expect(parts.year).toBe("2026");
    expect(parts.month).toBe("10");
    expect(parts.day).toBe("12");
    expect(parts.hour).toBe("14");
    expect(parts.minute).toBe("45");
  });

  it("formats Pacific date/time variants and ranges", () => {
    const start = "2026-06-15T19:00:00.000Z";
    const end = "2026-06-15T20:30:00.000Z";

    expect(toPacificDate(start)).toBeInstanceOf(Date);
    expect(formatPacificTime(start)).toMatch(/^\d{1,2}:\d{2}\s[AP]M$/);
    expect(formatPacificTime(start, true)).toMatch(/^\d{1,2}:\d{2}:\d{2}\s[AP]M$/);
    expect(formatPacificDate(start)).toBe("Jun 15, 2026");
    expect(formatPacificDateTime(start)).toMatch(/^Jun 15, 2026 \d{1,2}:\d{2}\s[AP]M$/);
    expect(formatPacificDateTimeFull(start)).toMatch(/^June 15, 2026 at \d{1,2}:\d{2}\s[AP]M$/);
    expect(formatPacificDayOfWeek(start)).toBe("Monday");
    expect(formatPacificDayAndMonth(start)).toBe("June 15");
    expect(formatPacificTimeRange(start, end)).toMatch(
      /^\d{1,2}:\d{2}\s[AP]M - \d{1,2}:\d{2}\s[AP]M$/
    );
  });

  it("handles relative-time branches for just now and minutes", () => {
    expect(formatPacificRelative("2026-06-15T18:59:40.000Z")).toBe("just now");
    expect(formatPacificRelative("2026-06-15T18:30:00.000Z")).toBe("about 30 minutes ago");
  });

  it("handles friendly date branches for today/tomorrow/yesterday/weekly/far", () => {
    expect(formatPacificFriendly("2026-06-15T20:00:00.000Z", false)).toBe("Today");
    expect(formatPacificFriendly("2026-06-16T19:00:00.000Z", false)).toBe("Tomorrow");
    expect(formatPacificFriendly("2026-06-14T19:00:00.000Z", false)).toBe("Yesterday");

    const withinWeek = formatPacificFriendly("2026-06-18T19:00:00.000Z", false);
    expect(withinWeek).toBe("Thursday");

    const farFuture = formatPacificFriendly("2026-07-30T19:00:00.000Z", false);
    expect(farFuture).toMatch(/^[A-Z][a-z]{2} \d{1,2}, 2026$/);
  });

  it("handles due-date branches for today/tomorrow/overdue and default", () => {
    expect(formatPacificDueDate("2026-06-15T22:00:00.000Z")).toMatch(/^Today at \d{1,2}:\d{2}\s[AP]M$/);
    expect(formatPacificDueDate("2026-06-16T21:00:00.000Z")).toMatch(/^Tomorrow at \d{1,2}:\d{2}\s[AP]M$/);

    const overdueToday = formatPacificDueDate("2026-06-15T16:00:00.000Z");
    expect(overdueToday).toMatch(/^Due today \(\d{1,2}:\d{2}\s[AP]M\)$/);

    const overdueDays = formatPacificDueDate("2026-06-13T19:00:00.000Z");
    expect(overdueDays).toMatch(/^2 days overdue \([A-Z][a-z]{2} \d{1,2}\)$/);

    const future = formatPacificDueDate("2026-06-20T19:00:00.000Z");
    expect(future).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{1,2}:\d{2}\s[AP]M$/);
  });
});
