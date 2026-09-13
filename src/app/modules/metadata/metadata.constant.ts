import { IMetadataSeed, TMetadataType, metadataTypeList } from './metadata.interface';

export const METADATA_TYPES: ReadonlyArray<TMetadataType> = metadataTypeList;

type MetadataSeedMap = Record<TMetadataType, IMetadataSeed[]>;

export const DEFAULT_METADATA: MetadataSeedMap = {
  practiceAreas: [
    { key: 'corporate-law', label: 'Corporate Law', description: 'Entity governance, M&A, compliance', icon: 'scale', sortOrder: 10 },
    { key: 'criminal-defense', label: 'Criminal Defense', description: 'Felony, misdemeanor, white-collar', icon: 'gavel', sortOrder: 20 },
    { key: 'family-law', label: 'Family Law', description: 'Divorce, custody, adoption', icon: 'heart', sortOrder: 30 },
    { key: 'intellectual-property', label: 'Intellectual Property', description: 'Patents, trademarks, copyrights', icon: 'sparkles', sortOrder: 40 },
    { key: 'real-estate', label: 'Real Estate', description: 'Commercial + residential transactions', icon: 'building', sortOrder: 50 },
    { key: 'civil-litigation', label: 'Civil Litigation', description: 'Disputes, tort, class actions', icon: 'balance', sortOrder: 60 },
    { key: 'employment-law', label: 'Employment Law', description: 'HR policies, disputes, compliance', icon: 'briefcase', sortOrder: 70 },
    { key: 'immigration-law', label: 'Immigration Law', description: 'Visa strategy, filings, appeals', icon: 'globe', sortOrder: 80 },
  ],
  languages: [
    { key: 'en', label: 'English', locale: 'en-US', sortOrder: 10 },
    { key: 'es', label: 'Spanish', locale: 'es-ES', sortOrder: 20 },
    { key: 'fr', label: 'French', locale: 'fr-FR', sortOrder: 30 },
    { key: 'de', label: 'German', locale: 'de-DE', sortOrder: 40 },
    { key: 'zh', label: 'Chinese (Mandarin)', locale: 'zh-CN', sortOrder: 50 },
    { key: 'ar', label: 'Arabic', locale: 'ar-AE', sortOrder: 60 },
    { key: 'hi', label: 'Hindi', locale: 'hi-IN', sortOrder: 70 },
  ],
  courtLocations: [
    { key: 'ny-supreme', label: 'New York Supreme Court', description: 'New York County', region: 'US-NY', metadata: { timezone: 'America/New_York', filingCutoff: '17:00 ET' }, sortOrder: 10 },
    { key: 'ca-superior', label: 'Los Angeles Superior Court', description: 'Stanley Mosk Courthouse', region: 'US-CA', metadata: { timezone: 'America/Los_Angeles', filingCutoff: '16:30 PT' }, sortOrder: 20 },
    { key: 'il-northern', label: 'US District Court, N.D. Illinois', description: 'Everett M. Dirksen U.S. Courthouse', region: 'US-IL', metadata: { timezone: 'America/Chicago' }, sortOrder: 30 },
    { key: 'tx-dallas', label: 'Dallas County Civil District', region: 'US-TX', metadata: { timezone: 'America/Chicago' }, sortOrder: 40 },
    { key: 'federal-circuit', label: 'US Court of Appeals for the Federal Circuit', region: 'US-DC', metadata: { timezone: 'America/New_York' }, sortOrder: 50 },
    { key: 'intl-icj', label: 'International Court of Justice', region: 'NL', metadata: { timezone: 'Europe/Amsterdam' }, sortOrder: 60 },
  ],
  caseTypes: [
    { key: 'litigation', label: 'Complex Litigation', description: 'Multi-party, MDL, class actions', icon: 'layers-3', sortOrder: 10 },
    { key: 'regulatory', label: 'Regulatory & Compliance', description: 'SEC, FINRA, GDPR reviews', icon: 'shield-check', sortOrder: 20 },
    { key: 'transactional', label: 'Transactional', description: 'M&A, venture financings', icon: 'shuffle', sortOrder: 30 },
    { key: 'employment', label: 'Employment Dispute', description: 'EEOC, wrongful termination', icon: 'users', sortOrder: 40 },
    { key: 'ip-enforcement', label: 'IP Enforcement', description: 'Infringement, takedown, licensing', icon: 'copyright', sortOrder: 50 },
    { key: 'immigration', label: 'Immigration', description: 'Business visas, asylum, PERM', icon: 'globe', sortOrder: 60 },
  ],
  documentTemplates: [
    { key: 'engagement-letter', label: 'Client Engagement Letter', description: 'Services scope + billing', sortOrder: 10 },
    { key: 'nda', label: 'Mutual NDA', description: 'Two-way confidentiality', sortOrder: 20 },
    { key: 'msa', label: 'Master Services Agreement', description: 'Modular statement of work', sortOrder: 30 },
    { key: 'demand-letter', label: 'Demand Letter', description: 'Pre-litigation notice', sortOrder: 40 },
    { key: 'motion-to-dismiss', label: 'Motion to Dismiss', description: 'Civil procedure template', sortOrder: 50 },
    { key: 'brief-template', label: 'Appellate Brief Outline', description: 'Rule-compliant headings', sortOrder: 60 },
  ],
  urgencyLevels: [
    { key: 'critical-24h', label: 'Critical · 24h', description: 'Court deadline < 24 hours', color: '#ff6b6b', sortOrder: 5 },
    { key: 'high-72h', label: 'High · 72h', description: 'Response needed in 3 days', color: '#ffb347', sortOrder: 10 },
    { key: 'standard-week', label: 'Standard · 7d', description: 'Typical workflow window', color: '#5CDBD6', sortOrder: 20 },
    { key: 'low-flex', label: 'Low · Flexible', description: 'No fixed deadline', color: '#9ca3af', sortOrder: 30 },
  ],
  hearingTypes: [
    { key: 'arraignment', label: 'Arraignment', description: 'Initial criminal appearance', sortOrder: 10 },
    { key: 'status-conference', label: 'Status Conference', description: 'Scheduling + housekeeping', sortOrder: 20 },
    { key: 'oral-argument', label: 'Oral Argument', description: 'Appellate or dispositive motions', sortOrder: 30 },
    { key: 'mediation', label: 'Mediation Session', description: 'ADR facilitated negotiation', sortOrder: 40 },
    { key: 'settlement-conf', label: 'Settlement Conference', description: 'Judge-led negotiation', sortOrder: 50 },
    { key: 'trial', label: 'Trial', description: 'Bench or jury trial date', sortOrder: 60 },
  ],
  legalSpecializations: [
    { key: 'ai-compliance', label: 'AI Compliance & Governance', description: 'EU AI Act, NIST RMF, AI policies', sortOrder: 10 },
    { key: 'fintech-regulation', label: 'FinTech & Payments', description: 'Banking, AML, crypto licensing', sortOrder: 20 },
    { key: 'cybersecurity', label: 'Cybersecurity & Incident Response', description: 'Data breaches, SOC II, privacy', sortOrder: 30 },
    { key: 'healthcare', label: 'Healthcare & Life Sciences', description: 'HIPAA, FDA, clinical trials', sortOrder: 40 },
    { key: 'energy-infrastructure', label: 'Energy & Infrastructure', description: 'FERC, EPC contracts, ESG', sortOrder: 50 },
    { key: 'international-trade', label: 'International Trade & Sanctions', description: 'OFAC, BIS, customs', sortOrder: 60 },
  ],
};

export const PRACTICE_AREAS = DEFAULT_METADATA.practiceAreas.map(seed => ({
  id: seed.key,
  name: seed.label,
}));

export const LANGUAGES = DEFAULT_METADATA.languages.map(seed => ({
  code: seed.key,
  name: seed.label,
}));
