/**
 * Task Templates - Reusable templates for common task types
 * Templates can be used to quickly create standardized tasks
 */

export interface TaskTemplate {
    id: string;
    name: string;
    description: string;
    category: string;
    icon: string; // Lucide icon name
    defaultPriority: 'low' | 'medium' | 'high' | 'urgent';
    defaultDueDays: number; // Days from creation
    suggestedTitle: string;
    suggestedDescription: string;
    tags?: string[];
    /** If true, this template requires a client to be selected */
    requiresClient: boolean;
}

export const TASK_TEMPLATES: TaskTemplate[] = [
    // Intake & Onboarding
    {
        id: 'initial-assessment',
        name: 'Initial Assessment',
        description: 'Schedule and complete client intake assessment',
        category: 'intake',
        icon: 'ClipboardList',
        defaultPriority: 'high',
        defaultDueDays: 3,
        suggestedTitle: 'Complete Initial Assessment',
        suggestedDescription: 'Schedule and conduct the initial client assessment. Review eligibility criteria and document current situation.',
        tags: ['intake', 'assessment'],
        requiresClient: true,
    },
    {
        id: 'collect-documents',
        name: 'Document Collection',
        description: 'Collect required client documents (ID, income, etc.)',
        category: 'documentation',
        icon: 'FileText',
        defaultPriority: 'high',
        defaultDueDays: 7,
        suggestedTitle: 'Collect Required Documents',
        suggestedDescription: 'Collect and verify the following documents:\n- Valid photo ID\n- Proof of income\n- Proof of residence\n- Any program-specific documents',
        tags: ['documents', 'verification'],
        requiresClient: true,
    },
    {
        id: 'eligibility-review',
        name: 'Eligibility Review',
        description: 'Review client eligibility for programs',
        category: 'intake',
        icon: 'CheckSquare',
        defaultPriority: 'medium',
        defaultDueDays: 5,
        suggestedTitle: 'Review Program Eligibility',
        suggestedDescription: 'Review client documentation and determine eligibility for available programs. Document findings and next steps.',
        tags: ['eligibility', 'programs'],
        requiresClient: true,
    },

    // Case Management
    {
        id: 'follow-up-call',
        name: 'Follow-up Call',
        description: 'Check in with client via phone call',
        category: 'follow-up',
        icon: 'Phone',
        defaultPriority: 'medium',
        defaultDueDays: 7,
        suggestedTitle: 'Follow-up Phone Call',
        suggestedDescription: 'Check in with client to:\n- Review progress on goals\n- Address any barriers or concerns\n- Update case notes',
        tags: ['follow-up', 'communication'],
        requiresClient: true,
    },
    {
        id: 'home-visit',
        name: 'Home Visit',
        description: 'Schedule and conduct a home visit',
        category: 'follow-up',
        icon: 'Home',
        defaultPriority: 'medium',
        defaultDueDays: 14,
        suggestedTitle: 'Conduct Home Visit',
        suggestedDescription: 'Schedule and complete home visit. Assess living conditions and document any needs or concerns.',
        tags: ['home-visit', 'assessment'],
        requiresClient: true,
    },
    {
        id: 'case-review',
        name: 'Case Review',
        description: 'Monthly or quarterly case review',
        category: 'review',
        icon: 'FileSearch',
        defaultPriority: 'medium',
        defaultDueDays: 30,
        suggestedTitle: 'Conduct Case Review',
        suggestedDescription: 'Complete periodic case review:\n- Review progress toward goals\n- Update service plan if needed\n- Document outcomes and next steps',
        tags: ['review', 'planning'],
        requiresClient: true,
    },

    // Housing
    {
        id: 'housing-application',
        name: 'Housing Application',
        description: 'Assist with housing application submission',
        category: 'housing',
        icon: 'Building',
        defaultPriority: 'high',
        defaultDueDays: 5,
        suggestedTitle: 'Submit Housing Application',
        suggestedDescription: 'Assist client with completing and submitting housing application. Ensure all required documents are attached.',
        tags: ['housing', 'application'],
        requiresClient: true,
    },
    {
        id: 'landlord-mediation',
        name: 'Landlord Mediation',
        description: 'Mediate issue between client and landlord',
        category: 'housing',
        icon: 'Users',
        defaultPriority: 'high',
        defaultDueDays: 3,
        suggestedTitle: 'Landlord Mediation',
        suggestedDescription: 'Contact landlord to discuss and mediate current issue. Document outcome and any agreements reached.',
        tags: ['housing', 'mediation'],
        requiresClient: true,
    },

    // Benefits & Services
    {
        id: 'benefits-enrollment',
        name: 'Benefits Enrollment',
        description: 'Help client enroll in benefits program',
        category: 'benefits',
        icon: 'Shield',
        defaultPriority: 'high',
        defaultDueDays: 7,
        suggestedTitle: 'Complete Benefits Enrollment',
        suggestedDescription: 'Assist client with enrolling in eligible benefits program. Complete application and submit required documentation.',
        tags: ['benefits', 'enrollment'],
        requiresClient: true,
    },
    {
        id: 'referral',
        name: 'External Referral',
        description: 'Make referral to external service provider',
        category: 'referral',
        icon: 'ExternalLink',
        defaultPriority: 'medium',
        defaultDueDays: 5,
        suggestedTitle: 'Process External Referral',
        suggestedDescription: 'Complete referral to external service provider:\n- Contact provider\n- Share relevant information (with consent)\n- Confirm appointment or next steps',
        tags: ['referral', 'coordination'],
        requiresClient: true,
    },

    // Administrative
    {
        id: 'case-closure',
        name: 'Case Closure',
        description: 'Complete case closure process',
        category: 'administrative',
        icon: 'FolderClosed',
        defaultPriority: 'medium',
        defaultDueDays: 7,
        suggestedTitle: 'Complete Case Closure',
        suggestedDescription: 'Complete case closure procedures:\n- Final case notes\n- Outcome documentation\n- Archive files\n- Send closure letter if applicable',
        tags: ['closure', 'administrative'],
        requiresClient: true,
    },
    {
        id: 'report-submission',
        name: 'Report Submission',
        description: 'Submit required report or documentation',
        category: 'administrative',
        icon: 'Send',
        defaultPriority: 'high',
        defaultDueDays: 5,
        suggestedTitle: 'Submit Required Report',
        suggestedDescription: 'Complete and submit required report by deadline. Ensure all data is accurate and complete.',
        tags: ['reporting', 'administrative'],
        requiresClient: false,
    },
    {
        id: 'team-meeting',
        name: 'Team Meeting',
        description: 'Schedule or prepare for team meeting',
        category: 'administrative',
        icon: 'Users',
        defaultPriority: 'low',
        defaultDueDays: 7,
        suggestedTitle: 'Team Meeting Preparation',
        suggestedDescription: 'Prepare agenda and materials for upcoming team meeting.',
        tags: ['meeting', 'administrative'],
        requiresClient: false,
    },

    // Client Communication
    {
        id: 'appointment-reminder',
        name: 'Send Reminder',
        description: 'Send appointment or deadline reminder to client',
        category: 'communication',
        icon: 'Bell',
        defaultPriority: 'medium',
        defaultDueDays: 1,
        suggestedTitle: 'Send Appointment Reminder',
        suggestedDescription: 'Contact client to remind them of upcoming appointment or deadline.',
        tags: ['reminder', 'communication'],
        requiresClient: true,
    },
    {
        id: 'status-update',
        name: 'Status Update',
        description: 'Provide status update to client',
        category: 'communication',
        icon: 'MessageCircle',
        defaultPriority: 'low',
        defaultDueDays: 3,
        suggestedTitle: 'Provide Status Update',
        suggestedDescription: 'Contact client to provide update on their case or pending applications.',
        tags: ['update', 'communication'],
        requiresClient: true,
    },
];

/**
 * Get templates grouped by category
 */
export function getTemplatesByCategory(): Record<string, TaskTemplate[]> {
    return TASK_TEMPLATES.reduce((acc, template) => {
        if (!acc[template.category]) {
            acc[template.category] = [];
        }
        acc[template.category].push(template);
        return acc;
    }, {} as Record<string, TaskTemplate[]>);
}

/**
 * Get human-readable category name
 */
export function getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
        intake: 'Intake & Onboarding',
        documentation: 'Documentation',
        'follow-up': 'Follow-up',
        review: 'Case Review',
        housing: 'Housing',
        benefits: 'Benefits & Services',
        referral: 'Referrals',
        administrative: 'Administrative',
        communication: 'Client Communication',
    };
    return labels[category] || category;
}

/**
 * Calculate due date from template
 */
export function calculateDueDate(template: TaskTemplate): string {
    const date = new Date();
    date.setDate(date.getDate() + template.defaultDueDays);
    return date.toISOString().split('T')[0];
}

/**
 * Find template by ID
 */
export function getTemplateById(id: string): TaskTemplate | undefined {
    return TASK_TEMPLATES.find(t => t.id === id);
}
