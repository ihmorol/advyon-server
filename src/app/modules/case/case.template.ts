import { CaseTypes } from './case.constant';

/**
 * WBS-5.1: Case Templates
 * Predefined case templates with default folders, deadlines, and configurations.
 */

export interface CaseTemplate {
    id: string;
    name: string;
    caseType: (typeof CaseTypes)[number];
    description: string;
    defaultFolders: { name: string; order: number }[];
    defaultUrgency: 'low' | 'medium' | 'high';
    estimatedDurationDays: number;
    defaultDeadlineDescription?: string;
}

export const CASE_TEMPLATES: CaseTemplate[] = [
    {
        id: 'tmpl-criminal-defense',
        name: 'Criminal Defense',
        caseType: 'Criminal Defense',
        description: 'Standard criminal defense case template with evidence and witness management.',
        defaultFolders: [
            { name: 'Evidence', order: 0 },
            { name: 'Witness Statements', order: 1 },
            { name: 'Court Filings', order: 2 },
            { name: 'Police Reports', order: 3 },
            { name: 'Bail Documents', order: 4 },
            { name: 'Correspondence', order: 5 },
        ],
        defaultUrgency: 'high',
        estimatedDurationDays: 180,
        defaultDeadlineDescription: 'Arraignment hearing',
    },
    {
        id: 'tmpl-civil-litigation',
        name: 'Civil Litigation',
        caseType: 'Civil Litigation',
        description: 'Civil dispute case template with discovery and pleading management.',
        defaultFolders: [
            { name: 'Pleadings', order: 0 },
            { name: 'Discovery', order: 1 },
            { name: 'Depositions', order: 2 },
            { name: 'Expert Reports', order: 3 },
            { name: 'Settlement Documents', order: 4 },
            { name: 'Correspondence', order: 5 },
        ],
        defaultUrgency: 'medium',
        estimatedDurationDays: 365,
        defaultDeadlineDescription: 'Initial filing deadline',
    },
    {
        id: 'tmpl-corporate-law',
        name: 'Corporate Law',
        caseType: 'Corporate Law',
        description: 'Corporate legal matter template for contracts, mergers, and compliance.',
        defaultFolders: [
            { name: 'Contracts', order: 0 },
            { name: 'Due Diligence', order: 1 },
            { name: 'Regulatory Filings', order: 2 },
            { name: 'Board Resolutions', order: 3 },
            { name: 'Financial Documents', order: 4 },
        ],
        defaultUrgency: 'medium',
        estimatedDurationDays: 90,
        defaultDeadlineDescription: 'Contract review deadline',
    },
    {
        id: 'tmpl-family-law',
        name: 'Family Law',
        caseType: 'Family Law',
        description: 'Family law case template for divorce, custody, and support matters.',
        defaultFolders: [
            { name: 'Petition & Response', order: 0 },
            { name: 'Financial Declarations', order: 1 },
            { name: 'Custody Documents', order: 2 },
            { name: 'Medical Records', order: 3 },
            { name: 'Correspondence', order: 4 },
        ],
        defaultUrgency: 'high',
        estimatedDurationDays: 270,
        defaultDeadlineDescription: 'Initial hearing date',
    },
    {
        id: 'tmpl-immigration',
        name: 'Immigration',
        caseType: 'Immigration',
        description: 'Immigration case template for visa applications, asylum, and citizenship.',
        defaultFolders: [
            { name: 'Application Forms', order: 0 },
            { name: 'Supporting Documents', order: 1 },
            { name: 'Identity Documents', order: 2 },
            { name: 'Employment Records', order: 3 },
            { name: 'USCIS Correspondence', order: 4 },
        ],
        defaultUrgency: 'high',
        estimatedDurationDays: 365,
        defaultDeadlineDescription: 'Application filing deadline',
    },
    {
        id: 'tmpl-ip',
        name: 'Intellectual Property',
        caseType: 'Intellectual Property',
        description: 'IP case template for patents, trademarks, copyrights, and trade secrets.',
        defaultFolders: [
            { name: 'Patent/TM Applications', order: 0 },
            { name: 'Prior Art Research', order: 1 },
            { name: 'Infringement Analysis', order: 2 },
            { name: 'Licensing Agreements', order: 3 },
            { name: 'Correspondence', order: 4 },
        ],
        defaultUrgency: 'medium',
        estimatedDurationDays: 180,
        defaultDeadlineDescription: 'Filing deadline',
    },
    {
        id: 'tmpl-real-estate',
        name: 'Real Estate',
        caseType: 'Real Estate',
        description: 'Real estate transaction template for purchases, leases, and disputes.',
        defaultFolders: [
            { name: 'Purchase Agreement', order: 0 },
            { name: 'Title Documents', order: 1 },
            { name: 'Inspection Reports', order: 2 },
            { name: 'Financial Documents', order: 3 },
            { name: 'Closing Documents', order: 4 },
        ],
        defaultUrgency: 'medium',
        estimatedDurationDays: 60,
        defaultDeadlineDescription: 'Closing date',
    },
    {
        id: 'tmpl-general',
        name: 'General Case',
        caseType: 'Tax Law',
        description: 'General case template suitable for various legal matters.',
        defaultFolders: [
            { name: 'Evidence', order: 0 },
            { name: 'Legal Documents', order: 1 },
            { name: 'Correspondence', order: 2 },
            { name: 'Notes', order: 3 },
        ],
        defaultUrgency: 'low',
        estimatedDurationDays: 120,
        defaultDeadlineDescription: 'Initial review',
    },
];
