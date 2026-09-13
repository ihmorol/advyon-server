export interface IContactAttachment {
  label: string;
  url: string;
}

export interface IContactTicket {
  referenceId: string;
  fullName: string;
  email: string;
  orgName?: string;
  role?: string;
  phone?: string;
  topicKey: string;
  topicLabel?: string;
  urgencyKey: string;
  message: string;
  source: 'public-site' | 'marketing' | 'unknown';
  status: 'new' | 'triaged' | 'closed';
  attachments?: IContactAttachment[];
  ipAddress?: string;
  userAgent?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ContactMetaResponse {
  topics: Array<{ key: string; label: string; description?: string }>;
  urgencyLevels: Array<{ key: string; label: string; description?: string; color?: string }>;
  offices: Array<{
    city: string;
    address: string;
    timezone: string;
    phone: string;
    email: string;
  }>;
  socials: Array<{ label: string; url: string; icon: string }>;
}
