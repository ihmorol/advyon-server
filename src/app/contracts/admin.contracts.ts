/**
 * @fileoverview Admin module API contracts.
 * Defines request/response shapes for admin endpoints.
 */

export interface IUpdateUserRoleRequest {
  role: 'superAdmin' | 'admin' | 'lawyer' | 'client' | 'judge';
}

export interface IUpdateUserStatusRequest {
  status: 'active' | 'blocked' | 'in-progress';
}

export interface IBulkUserUpdateRequest {
  userIds: string[];
  action: 'activate' | 'block' | 'delete';
}

export interface ISystemSettingsResponse {
  siteName: string;
  maintenanceMode: boolean;
  allowRegistration: boolean;
  maxUploadSizeMB: number;
  defaultUserRole: string;
  sessionTimeoutMinutes: number;
  features: {
    aiTools: boolean;
    communityHub: boolean;
    billing: boolean;
    notifications: boolean;
  };
}

export interface IAuditLogEntry {
  action: string;
  actorEmail: string;
  actorRole: string;
  target?: string;
  targetType?: 'user' | 'case' | 'setting' | 'payment' | 'system';
  details?: Record<string, unknown>;
  createdAt: string;
}
