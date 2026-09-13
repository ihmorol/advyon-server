import { Schema, model } from 'mongoose';
import { TPersonalization } from './personalization.interface';

const behaviorEventSchema = new Schema(
    {
        eventType: {
            type: String,
            enum: [
                'page_view',
                'case_open',
                'document_access',
                'search_query',
                'feature_use',
                'notification_click',
            ],
            required: true,
        },
        metadata: { type: Schema.Types.Mixed, default: {} },
        timestamp: { type: Date, default: Date.now },
    },
    { _id: false },
);

const dashboardWidgetSchema = new Schema(
    {
        widgetId: { type: String, required: true },
        position: { type: Number, required: true },
        visible: { type: Boolean, default: true },
        size: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' },
    },
    { _id: false },
);

const personalizationSchema = new Schema<TPersonalization>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true,
        },
        behaviorLog: {
            type: [behaviorEventSchema],
            default: [],
        },
        casePreferences: {
            defaultCaseType: { type: String },
            defaultUrgency: { type: String },
            preferredView: { type: String, enum: ['list', 'grid', 'kanban'], default: 'list' },
        },
        dashboardWidgets: {
            type: [dashboardWidgetSchema],
            default: [
                { widgetId: 'active-cases', position: 0, visible: true, size: 'medium' },
                { widgetId: 'upcoming-deadlines', position: 1, visible: true, size: 'medium' },
                { widgetId: 'recent-documents', position: 2, visible: true, size: 'small' },
                { widgetId: 'messages', position: 3, visible: true, size: 'small' },
            ],
        },
        notificationPreferences: {
            channels: {
                inApp: { type: Boolean, default: true },
                email: { type: Boolean, default: true },
                webPush: { type: Boolean, default: false },
            },
            types: { type: Schema.Types.Mixed, default: {} },
        },
        searchHistory: [
            {
                query: { type: String },
                timestamp: { type: Date, default: Date.now },
                resultCount: { type: Number, default: 0 },
                _id: false,
            },
        ],
        documentAccessPatterns: [
            {
                documentId: { type: Schema.Types.ObjectId, ref: 'Document' },
                accessCount: { type: Number, default: 1 },
                lastAccessed: { type: Date, default: Date.now },
                _id: false,
            },
        ],
    },
    { timestamps: true },
);

// Cap behavior log at 500 entries to prevent unbounded growth
personalizationSchema.pre('save', function (next) {
    if (this.behaviorLog && this.behaviorLog.length > 500) {
        this.behaviorLog = this.behaviorLog.slice(-500);
    }
    if (this.searchHistory && this.searchHistory.length > 100) {
        this.searchHistory = this.searchHistory.slice(-100);
    }
    next();
});

personalizationSchema.index({ userId: 1 });

export const Personalization = model<TPersonalization>(
    'Personalization',
    personalizationSchema,
);
