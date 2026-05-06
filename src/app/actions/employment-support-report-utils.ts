const INTERACTION_TYPE_ORDER = ["call", "email", "meeting", "note", "status_change", "other"] as const;
const EMPLOYMENT_SUPPORT_ASSIGNED_STAFF_LABEL = "Employment Support";

type SupportedInteractionType = (typeof INTERACTION_TYPE_ORDER)[number];

type InteractionCounts = Record<SupportedInteractionType, number>;

interface ClientRecord {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
}

interface StaffRecord {
  first_name?: string | null;
  last_name?: string | null;
}

interface IntakeRecord {
  status?: string | null;
  readiness_status?: string | null;
  assigned_staff?: StaffRecord | null;
}

export interface EnrollmentReportQueryRow {
  id: string;
  status: string;
  start_date?: string | null;
  updated_at?: string | null;
  clients?: ClientRecord | ClientRecord[] | null;
  employment_support_intake?: IntakeRecord[] | IntakeRecord | null;
}

export interface HistoryQueryRow {
  client_id: string;
  action_type?: string | null;
  created_at?: string | null;
  metadata?: {
    program_id?: string | null;
    program_name?: string | null;
  } | null;
}

export interface EmploymentSupportEngagementReportRow {
  enrollmentId: string;
  clientId: string;
  clientName: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  enrollmentStatus: string;
  startDate: string | null;
  updatedAt: string | null;
  intakeStatus: string;
  readinessStatus: string | null;
  assignedStaff: string;
  totalInteractions: number;
  callCount: number;
  emailCount: number;
  meetingCount: number;
  noteCount: number;
  statusChangeCount: number;
  otherCount: number;
  interactionTypesSummary: string;
  lastInteractionAt: string | null;
}

function createEmptyInteractionCounts(): InteractionCounts {
  return {
    call: 0,
    email: 0,
    meeting: 0,
    note: 0,
    status_change: 0,
    other: 0,
  };
}

export function normalizeClientRecord(value: EnrollmentReportQueryRow["clients"]): ClientRecord | null {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function normalizeIntakeRecord(
  value: EnrollmentReportQueryRow["employment_support_intake"]
): IntakeRecord | null {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function normalizeInteractionType(value?: string | null): SupportedInteractionType {
  if (value && INTERACTION_TYPE_ORDER.includes(value as SupportedInteractionType)) {
    return value as SupportedInteractionType;
  }

  return "other";
}

function getInteractionLabel(type: SupportedInteractionType, count: number): string {
  switch (type) {
    case "call":
      return count === 1 ? "call" : "calls";
    case "email":
      return count === 1 ? "email" : "emails";
    case "meeting":
      return count === 1 ? "meeting" : "meetings";
    case "note":
      return count === 1 ? "note" : "notes";
    case "status_change":
      return count === 1 ? "status change" : "status changes";
    case "other":
      return "other";
    default:
      return "other";
  }
}

function formatInteractionTypesSummary(counts: InteractionCounts): string {
  const parts = INTERACTION_TYPE_ORDER.filter((type) => counts[type] > 0).map(
    (type) => `${counts[type]} ${getInteractionLabel(type, counts[type])}`
  );

  return parts.length > 0 ? parts.join("; ") : "No logged interactions";
}

function formatAssignedStaff(staff?: StaffRecord | null): string {
  const firstName = staff?.first_name?.trim() ?? "";
  const lastName = staff?.last_name?.trim() ?? "";
  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || EMPLOYMENT_SUPPORT_ASSIGNED_STAFF_LABEL;
}

function csvEscape(value: string | number | null | undefined): string {
  const stringValue = value == null ? "" : String(value);

  if (!/[",\n\r]/.test(stringValue)) {
    return stringValue;
  }

  return `"${stringValue.replace(/"/g, '""')}"`;
}

export function buildEmploymentSupportEngagementRows(
  enrollments: EnrollmentReportQueryRow[],
  histories: HistoryQueryRow[]
): EmploymentSupportEngagementReportRow[] {
  const historiesByClientId = new Map<string, HistoryQueryRow[]>();

  for (const history of histories) {
    const clientHistory = historiesByClientId.get(history.client_id) ?? [];
    clientHistory.push(history);
    historiesByClientId.set(history.client_id, clientHistory);
  }

  const rows = enrollments.flatMap((enrollment) => {
    const client = normalizeClientRecord(enrollment.clients);

    if (!client?.id) {
      return [];
    }

    const intake = normalizeIntakeRecord(enrollment.employment_support_intake);
    const history = historiesByClientId.get(client.id) ?? [];
    const counts = createEmptyInteractionCounts();
    let lastInteractionAt: string | null = null;

    for (const item of history) {
      const interactionType = normalizeInteractionType(item.action_type);
      counts[interactionType] += 1;

      if (item.created_at && (!lastInteractionAt || item.created_at > lastInteractionAt)) {
        lastInteractionAt = item.created_at;
      }
    }

    const firstName = client.first_name?.trim() ?? "";
    const lastName = client.last_name?.trim() ?? "";
    const clientName = `${firstName} ${lastName}`.trim() || "Unnamed client";

    return [
      {
        enrollmentId: enrollment.id,
        clientId: client.id,
        clientName,
        firstName,
        lastName,
        email: client.email ?? null,
        phone: client.phone ?? null,
        enrollmentStatus: enrollment.status,
        startDate: enrollment.start_date ?? null,
        updatedAt: enrollment.updated_at ?? null,
        intakeStatus: intake?.status ?? "not_started",
        readinessStatus: intake?.readiness_status ?? null,
        assignedStaff: formatAssignedStaff(intake?.assigned_staff),
        totalInteractions: history.length,
        callCount: counts.call,
        emailCount: counts.email,
        meetingCount: counts.meeting,
        noteCount: counts.note,
        statusChangeCount: counts.status_change,
        otherCount: counts.other,
        interactionTypesSummary: formatInteractionTypesSummary(counts),
        lastInteractionAt,
      },
    ];
  });

  return rows.sort((left, right) => left.clientName.localeCompare(right.clientName));
}

export function toEmploymentSupportEngagementCsv(
  rows: EmploymentSupportEngagementReportRow[]
): string {
  const headers = [
    "Client Name",
    "First Name",
    "Last Name",
    "Client ID",
    "Enrollment ID",
    "Email",
    "Phone",
    "Enrollment Status",
    "Enrollment Start Date",
    "Enrollment Updated At",
    "Intake Status",
    "Readiness Status",
    "Assigned Staff",
    "Total Tagged Interactions",
    "Tagged Calls",
    "Tagged Emails",
    "Tagged Meetings",
    "Tagged Notes",
    "Tagged Status Changes",
    "Tagged Other Interactions",
    "Last Tagged Interaction At",
    "Tagged Interaction Types Summary",
  ];

  const lines = rows.map((row) => [
    row.clientName,
    row.firstName,
    row.lastName,
    row.clientId,
    row.enrollmentId,
    row.email,
    row.phone,
    row.enrollmentStatus,
    row.startDate,
    row.updatedAt,
    row.intakeStatus,
    row.readinessStatus,
    row.assignedStaff,
    row.totalInteractions,
    row.callCount,
    row.emailCount,
    row.meetingCount,
    row.noteCount,
    row.statusChangeCount,
    row.otherCount,
    row.lastInteractionAt,
    row.interactionTypesSummary,
  ].map(csvEscape).join(","));

  return [headers.join(","), ...lines].join("\n");
}
