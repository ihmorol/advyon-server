import { Types } from 'mongoose';

// Behavior event types
export type TBehaviorEventType =
    | 'page_view'
    | 'case_open'
    | 'document_access'
    | 'search_query'
    | 'feature_use'
    | 'notification_click';

// Dashboard widget configuration
export interface TDashboardWidget {
    widgetId: string;
    position: number;
    visible: boolean;
    size: 'small' | 'medium' | 'large';
}

// Notification preference per type
export interface TNotificationTypePreference {
    inApp: boolean;
    email: boolean;
    webPush: boolean;
}

// Behavior log entry
export interface TBehaviorEvent {
    eventType: TBehaviorEventType;
    metadata: Record<string, unknown>;
    timestamp: Date;
}

// Main personalization interface
export interface TPersonalization {
    userId: Types.ObjectId;
    behaviorLog: TBehaviorEvent[];
    casePreferences: {
        defaultCaseType?: string;
        defaultUrgency?: string;
        preferredView?: 'list' | 'grid' | 'kanban';
    };
    dashboardWidgets: TDashboardWidget[];
    notificationPreferences: {
        channels: { inApp: boolean; email: boolean; webPush: boolean };
        types: Record<string, TNotificationTypePreference>;
    };
    searchHistory: { query: string; timestamp: Date; resultCount: number }[];
    documentAccessPatterns: {
        documentId: Types.ObjectId;
        accessCount: number;
        lastAccessed: Date;
    }[];
    createdAt: Date;
    updatedAt: Date;
}

// API payloads
export interface TUpdatePersonalizationPayload {
    casePreferences?: TPersonalization['casePreferences'];
    dashboardWidgets?: TDashboardWidget[];
    notificationPreferences?: TPersonalization['notificationPreferences'];
}

export interface TBehaviorEventPayload {
    eventType: TBehaviorEventType;
    metadata: Record<string, unknown>;
}
