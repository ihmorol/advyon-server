/**
 * @fileoverview Admin module TypeScript interfaces.
 * Covers user management, case oversight, system settings,
 * analytics, bulk operations, and audit logging.
 */

export type TUserRole =
  | 'superAdmin'
  | 'admin'
  | 'lawyer'
  | 'client'
  | 'judge';

export type TUserStatus = 'active' | 'blocked' | 'in-progress';

export type TUserFilter = {
  search?: string;
  role?: TUserRole;
  status?: TUserStatus;
};

export type TPaginationOptions = {
  page: number;
  limit: number;
  sort: string;
  skip: number;
};

export type TAdminQueryOptions = {
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  role?: TUserRole;
  status?: TUserStatus;
};

/** Bulk operation payload for updating multiple users at once */
export type TBulkUserUpdate = {
  userIds: string[];
  action: 'activate' | 'block' | 'delete';
};

/** Case overview aggregate stats */
export type TCaseOverview = {
  totalCases: number;
  activeCases: number;
  archivedCases: number;
  casesByStatus: Record<string, number>;
  casesByType: Record<string, number>;
  recentCases: any[];
};

/** System settings update payload */
export type TSystemSettingsUpdate = {
  siteName?: string;
  maintenanceMode?: boolean;
  allowRegistration?: boolean;
  maxUploadSizeMB?: number;
  defaultUserRole?: string;
  sessionTimeoutMinutes?: number;
  features?: {
    aiTools?: boolean;
    communityHub?: boolean;
    billing?: boolean;
    notifications?: boolean;
  };
};

/** Analytics overview summary */
export type TAnalyticsOverview = {
  totalUsers: number;
  activeUsers: number;
  totalCases: number;
  totalDocuments: number;
  recentRegistrations: number;
  usersByRole: Record<string, number>;
};

/** Audit log query filters */
export type TAuditLogFilter = {
  action?: string;
  actorId?: string;
  targetType?: string;
  startDate?: string;
  endDate?: string;
};
