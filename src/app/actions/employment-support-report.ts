"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { pacificToUTCISO } from "@/lib/date-utils";
import {
  buildEmploymentSupportEngagementRows,
  normalizeClientRecord,
  toEmploymentSupportEngagementCsv,
  type EnrollmentReportQueryRow,
  type HistoryQueryRow,
  type EmploymentSupportEngagementReportRow,
} from "./employment-support-report-utils";

export type { EmploymentSupportEngagementReportRow } from "./employment-support-report-utils";

const EMPLOYMENT_SUPPORT_PROGRAM_NAME = "Employment Support";
const PACIFIC_TIMEZONE = "America/Los_Angeles";
const STAFF_ROLES = new Set(["admin", "case_manager", "staff", "volunteer"]);
const ACTIVE_EMPLOYMENT_SUPPORT_STATUSES = ["interested", "applying", "enrolled"] as const;
const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PACIFIC_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: PACIFIC_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

interface ReportDateRange {
  startDate?: string;
  endDate?: string;
}

interface ProfileRoleRecord {
  role?: string | null;
}

export interface EmploymentSupportEngagementReportFilters {
  startDate?: string;
  endDate?: string;
}

export interface EmploymentSupportEngagementReportData {
  generatedAt: string;
  fileName: string;
  csv: string;
  rows: EmploymentSupportEngagementReportRow[];
}

function normalizeReportDate(value?: string): string | undefined {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return undefined;
  }

  if (!DATE_INPUT_PATTERN.test(trimmedValue)) {
    throw new Error("Report dates must use YYYY-MM-DD format");
  }

  return trimmedValue;
}

function normalizeReportDateRange(
  filters?: EmploymentSupportEngagementReportFilters
): ReportDateRange {
  const startDate = normalizeReportDate(filters?.startDate);
  const endDate = normalizeReportDate(filters?.endDate);

  if (startDate && endDate && startDate > endDate) {
    throw new Error("Start date must be on or before end date");
  }

  return {
    startDate,
    endDate,
  };
}

function addDays(dateValue: string, daysToAdd: number): string {
  const [year, month, day] = dateValue.split("-").map(Number);
  const nextDate = new Date(Date.UTC(year, month - 1, day));
  nextDate.setUTCDate(nextDate.getUTCDate() + daysToAdd);
  return nextDate.toISOString().slice(0, 10);
}

function getPacificSortableDate(dateValue: string): string {
  return PACIFIC_DATE_FORMATTER.format(new Date(dateValue));
}

function isWithinReportDateRange(history: HistoryQueryRow, range: ReportDateRange): boolean {
  if (!history.created_at) {
    return false;
  }

  const pacificDate = getPacificSortableDate(history.created_at);

  if (range.startDate && pacificDate < range.startDate) {
    return false;
  }

  if (range.endDate && pacificDate > range.endDate) {
    return false;
  }

  return true;
}

function isEmploymentSupportTaggedHistory(
  history: HistoryQueryRow,
  programId: string,
  programName: string
): boolean {
  const metadata = history.metadata;

  if (!metadata) {
    return false;
  }

  if (metadata.program_id === programId) {
    return true;
  }

  return metadata.program_name?.trim().toLowerCase() === programName.trim().toLowerCase();
}


function createReportPayload(rows: EmploymentSupportEngagementReportRow[]): EmploymentSupportEngagementReportData {
  const generatedAt = new Date().toISOString();

  return {
    generatedAt,
    fileName: `employment-support-engagement-report-${generatedAt.slice(0, 10)}.csv`,
    csv: toEmploymentSupportEngagementCsv(rows),
    rows,
  };
}

export async function getEmploymentSupportEngagementReport(
  filters?: EmploymentSupportEngagementReportFilters
): Promise<
  { success: true; data: EmploymentSupportEngagementReportData } | { success: false; error: string }
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "User not authenticated" };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (!STAFF_ROLES.has((profile as ProfileRoleRecord | null)?.role ?? "")) {
      return {
        success: false,
        error: "You do not have permission to access this report",
      };
    }

    const reportDateRange = normalizeReportDateRange(filters);

    const serviceClient = createServiceClient();

    const { data: program, error: programError } = await serviceClient
      .from("programs")
      .select("id, name")
      .ilike("name", EMPLOYMENT_SUPPORT_PROGRAM_NAME)
      .maybeSingle();

    if (programError) {
      throw programError;
    }

    if (!program) {
      return { success: true, data: createReportPayload([]) };
    }

    const { data: enrollments, error: enrollmentError } = await serviceClient
      .from("program_enrollments")
      .select(
        `
        id,
        status,
        start_date,
        updated_at,
        clients!inner (
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        employment_support_intake (
          status,
          readiness_status,
          assigned_staff:profiles!assigned_staff_id (
            first_name,
            last_name
          )
        )
      `
      )
      .eq("program_id", (program as { id: string }).id)
      .in("status", [...ACTIVE_EMPLOYMENT_SUPPORT_STATUSES])
      .order("updated_at", { ascending: false });

    if (enrollmentError) {
      throw enrollmentError;
    }

    const enrollmentRows = (enrollments ?? []) as EnrollmentReportQueryRow[];
    const clientIds = enrollmentRows
      .map((enrollment) => normalizeClientRecord(enrollment.clients)?.id)
      .filter((clientId): clientId is string => Boolean(clientId));

    let histories: HistoryQueryRow[] = [];

    if (clientIds.length > 0) {
      let historyQuery = serviceClient
        .from("client_history")
        .select("client_id, action_type, created_at, metadata")
        .in("client_id", clientIds);

      if (reportDateRange.startDate) {
        historyQuery = historyQuery.gte(
          "created_at",
          pacificToUTCISO(reportDateRange.startDate, "00:00")
        );
      }

      if (reportDateRange.endDate) {
        historyQuery = historyQuery.lt(
          "created_at",
          pacificToUTCISO(addDays(reportDateRange.endDate, 1), "00:00")
        );
      }

      const { data: historyRows, error: historyError } = await historyQuery.order("created_at", {
        ascending: false,
      });

      if (historyError) {
        throw historyError;
      }

      histories = (historyRows ?? []) as HistoryQueryRow[];
    }

    const filteredHistories = histories.filter(
      (history) =>
        isEmploymentSupportTaggedHistory(
          history,
          (program as { id: string }).id,
          ((program as { name?: string }).name ?? EMPLOYMENT_SUPPORT_PROGRAM_NAME)
        ) && isWithinReportDateRange(history, reportDateRange)
    );

    const rows = buildEmploymentSupportEngagementRows(enrollmentRows, filteredHistories);

    return {
      success: true,
      data: createReportPayload(rows),
    };
  } catch (error) {
    console.error("Error building employment support engagement report:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to build employment support engagement report",
    };
  }
}
