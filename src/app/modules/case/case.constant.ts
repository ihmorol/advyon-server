export const CaseStatus = ['active', 'pending', 'review', 'closed', 'archived'] as const;

export const CaseUrgency = ['low', 'medium', 'high'] as const;

export const CaseTypes = [
  'Criminal Defense',
  'Civil Litigation',
  'Corporate Law',
  'Family Law',
  'Immigration',
  'Intellectual Property',
  'Real Estate',
  'Tax Law',
  'Employment Law',
  'Environmental Law',
] as const;

export const DEFAULT_CASE_FOLDERS = [
  { name: 'Evidence', order: 0 },
  { name: 'Witness Statements', order: 1 },
  { name: 'Legal Documents', order: 2 },
  { name: 'Correspondence', order: 3 },
];
