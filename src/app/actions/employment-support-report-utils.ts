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

interface EnrollmentRecord {
  id: string;
  status?: string | null;
  start_date?: string | null;
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

export interface FollowUpReportQueryRow {
  id: string;
  status?: string | null;
  requested_at?: string | null;
  submitted_at?: string | null;
  employer?: string | null;
  job_title?: string | null;
  start_date?: string | null;
  salary?: string | null;
  schedule?: string | null;
  job_satisfaction?: string | null;
  supervisor_support?: string | null;
  has_transportation_challenges?: boolean | null;
  transportation_explanation?: string | null;
  has_coworker_or_employer_conflicts?: boolean | null;
  conflict_explanation?: string | null;
  has_uncovered_employment_costs?: boolean | null;
  cost_explanation?: string | null;
  needed_skills_or_training?: string | null;
  can_cover_basic_expenses?: string | null;
  wants_housing_and_self_sufficiency_connection?: string | null;
  wants_career_advancement_support?: string | null;
  additional_feedback?: string | null;
  clients?: ClientRecord | ClientRecord[] | null;
  program_enrollment?: EnrollmentRecord | EnrollmentRecord[] | null;
  requested_by_profile?: StaffRecord | StaffRecord[] | null;
  submitted_by_profile?: StaffRecord | StaffRecord[] | null;
}

export interface EmploymentFollowUpReportRow {
  followUpId: string;
  clientId: string;
  enrollmentId: string | null;
  clientName: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  enrollmentStatus: string | null;
  enrollmentStartDate: string | null;
  status: string;
  requestedAt: string | null;
  submittedAt: string | null;
  requestedBy: string;
  submittedBy: string;
  employer: string | null;
  jobTitle: string | null;
  startDate: string | null;
  salary: string | null;
  schedule: string | null;
  jobSatisfaction: string | null;
  supervisorSupport: string | null;
  hasTransportationChallenges: string;
  transportationExplanation: string | null;
  hasCoworkerOrEmployerConflicts: string;
  conflictExplanation: string | null;
  hasUncoveredEmploymentCosts: string;
  costExplanation: string | null;
  neededSkillsOrTraining: string | null;
  canCoverBasicExpenses: string | null;
  wantsHousingAndSelfSufficiencyConnection: string | null;
  wantsCareerAdvancementSupport: string | null;
  additionalFeedback: string | null;
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

function normalizeEnrollmentRecord(
  value: FollowUpReportQueryRow["program_enrollment"]
): EnrollmentRecord | null {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function normalizeStaffRecord(
  value: FollowUpReportQueryRow["requested_by_profile"]
): StaffRecord | null {
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

function formatStaffName(staff?: StaffRecord | null): string {
  const firstName = staff?.first_name?.trim() ?? "";
  const lastName = staff?.last_name?.trim() ?? "";
  return `${firstName} ${lastName}`.trim();
}

function formatBooleanFlag(value?: boolean | null): string {
  return value ? "Yes" : "No";
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

export function buildEmploymentFollowUpRows(
  followUps: FollowUpReportQueryRow[]
): EmploymentFollowUpReportRow[] {
  const rows = followUps.flatMap((followUp) => {
    const client = normalizeClientRecord(followUp.clients);

    if (!client?.id) {
      return [];
    }

    const enrollment = normalizeEnrollmentRecord(followUp.program_enrollment);
    const requestedBy = normalizeStaffRecord(followUp.requested_by_profile);
    const submittedBy = normalizeStaffRecord(followUp.submitted_by_profile);
    const firstName = client.first_name?.trim() ?? "";
    const lastName = client.last_name?.trim() ?? "";
    const clientName = `${firstName} ${lastName}`.trim() || "Unnamed client";

    return [
      {
        followUpId: followUp.id,
        clientId: client.id,
        enrollmentId: enrollment?.id ?? null,
        clientName,
        firstName,
        lastName,
        email: client.email ?? null,
        phone: client.phone ?? null,
        enrollmentStatus: enrollment?.status ?? null,
        enrollmentStartDate: enrollment?.start_date ?? null,
        status: followUp.status ?? "submitted",
        requestedAt: followUp.requested_at ?? null,
        submittedAt: followUp.submitted_at ?? null,
        requestedBy: formatStaffName(requestedBy),
        submittedBy: formatStaffName(submittedBy),
        employer: followUp.employer ?? null,
        jobTitle: followUp.job_title ?? null,
        startDate: followUp.start_date ?? null,
        salary: followUp.salary ?? null,
        schedule: followUp.schedule ?? null,
        jobSatisfaction: followUp.job_satisfaction ?? null,
        supervisorSupport: followUp.supervisor_support ?? null,
        hasTransportationChallenges: formatBooleanFlag(
          followUp.has_transportation_challenges
        ),
        transportationExplanation: followUp.transportation_explanation ?? null,
        hasCoworkerOrEmployerConflicts: formatBooleanFlag(
          followUp.has_coworker_or_employer_conflicts
        ),
        conflictExplanation: followUp.conflict_explanation ?? null,
        hasUncoveredEmploymentCosts: formatBooleanFlag(
          followUp.has_uncovered_employment_costs
        ),
        costExplanation: followUp.cost_explanation ?? null,
        neededSkillsOrTraining: followUp.needed_skills_or_training ?? null,
        canCoverBasicExpenses: followUp.can_cover_basic_expenses ?? null,
        wantsHousingAndSelfSufficiencyConnection:
          followUp.wants_housing_and_self_sufficiency_connection ?? null,
        wantsCareerAdvancementSupport:
          followUp.wants_career_advancement_support ?? null,
        additionalFeedback: followUp.additional_feedback ?? null,
      },
    ];
  });

  return rows.sort((left, right) => {
    const clientComparison = left.clientName.localeCompare(right.clientName);
    if (clientComparison !== 0) {
      return clientComparison;
    }

    const leftDate = left.requestedAt ?? left.submittedAt ?? "";
    const rightDate = right.requestedAt ?? right.submittedAt ?? "";
    return rightDate.localeCompare(leftDate);
  });
}

export function toEmploymentFollowUpCsv(rows: EmploymentFollowUpReportRow[]): string {
  const headers = [
    "Client Name",
    "First Name",
    "Last Name",
    "Client ID",
    "Enrollment ID",
    "Follow-Up ID",
    "Email",
    "Phone",
    "Enrollment Status",
    "Enrollment Start Date",
    "Follow-Up Status",
    "Requested At",
    "Submitted At",
    "Requested By",
    "Submitted By",
    "Employer",
    "Job Title",
    "Job Start Date",
    "Salary",
    "Schedule",
    "Job Satisfaction",
    "Supervisor Support",
    "Transportation Challenges",
    "Transportation Explanation",
    "Coworker Or Employer Conflicts",
    "Conflict Explanation",
    "Uncovered Employment Costs",
    "Cost Explanation",
    "Needed Skills Or Training",
    "Can Cover Basic Expenses",
    "Housing And Self Sufficiency Connection",
    "Career Advancement Support",
    "Additional Feedback",
  ];

  const lines = rows.map((row) => [
    row.clientName,
    row.firstName,
    row.lastName,
    row.clientId,
    row.enrollmentId,
    row.followUpId,
    row.email,
    row.phone,
    row.enrollmentStatus,
    row.enrollmentStartDate,
    row.status,
    row.requestedAt,
    row.submittedAt,
    row.requestedBy,
    row.submittedBy,
    row.employer,
    row.jobTitle,
    row.startDate,
    row.salary,
    row.schedule,
    row.jobSatisfaction,
    row.supervisorSupport,
    row.hasTransportationChallenges,
    row.transportationExplanation,
    row.hasCoworkerOrEmployerConflicts,
    row.conflictExplanation,
    row.hasUncoveredEmploymentCosts,
    row.costExplanation,
    row.neededSkillsOrTraining,
    row.canCoverBasicExpenses,
    row.wantsHousingAndSelfSufficiencyConnection,
    row.wantsCareerAdvancementSupport,
    row.additionalFeedback,
  ].map(csvEscape).join(","));

  return [headers.join(","), ...lines].join("\n");
}
