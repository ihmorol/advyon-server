import httpStatus from 'http-status';
import AppError from '../../errors/appError';
import { User } from './user.model';
import { Personalization } from './personalization.model';
import {
    TBehaviorEventPayload,
    TUpdatePersonalizationPayload,
} from './personalization.interface';

/**
 * WBS-4.1: Personalization Service
 * Async write pipeline — behavior events do not block the response.
 */

// Get or create personalization record for a user
const getOrCreatePersonalization = async (userId: string) => {
    const user = await User.findOne({ id: userId });
    if (!user) {
        throw new AppError(httpStatus.NOT_FOUND, 'User not found');
    }

    let personalization = await Personalization.findOne({ userId: user._id });
    if (!personalization) {
        personalization = await Personalization.create({ userId: user._id });
    }
    return personalization;
};

// Get user personalization data
const getPersonalization = async (userId: string) => {
    return getOrCreatePersonalization(userId);
};

// Update user personalization preferences
const updatePersonalization = async (
    userId: string,
    payload: TUpdatePersonalizationPayload,
) => {
    const user = await User.findOne({ id: userId });
    if (!user) {
        throw new AppError(httpStatus.NOT_FOUND, 'User not found');
    }

    const updateData: Record<string, unknown> = {};
    if (payload.casePreferences) {
        updateData.casePreferences = payload.casePreferences;
    }
    if (payload.dashboardWidgets) {
        updateData.dashboardWidgets = payload.dashboardWidgets;
    }
    if (payload.notificationPreferences) {
        updateData.notificationPreferences = payload.notificationPreferences;
    }

    const result = await Personalization.findOneAndUpdate(
        { userId: user._id },
        { $set: updateData },
        { new: true, upsert: true },
    );
    return result;
};

// Track user behavior (async, non-blocking)
const trackBehavior = async (
    userId: string,
    payload: TBehaviorEventPayload,
) => {
    const user = await User.findOne({ id: userId });
    if (!user) {
        throw new AppError(httpStatus.NOT_FOUND, 'User not found');
    }

    // Fire-and-forget push to behavior log
    await Personalization.findOneAndUpdate(
        { userId: user._id },
        {
            $push: {
                behaviorLog: {
                    $each: [{ ...payload, timestamp: new Date() }],
                    $slice: -500, // Keep only last 500 entries
                },
            },
        },
        { upsert: true },
    );

    // Track specific patterns
    if (payload.eventType === 'search_query' && payload.metadata?.query) {
        await Personalization.findOneAndUpdate(
            { userId: user._id },
            {
                $push: {
                    searchHistory: {
                        $each: [
                            {
                                query: payload.metadata.query as string,
                                timestamp: new Date(),
                                resultCount: (payload.metadata.resultCount as number) || 0,
                            },
                        ],
                        $slice: -100,
                    },
                },
            },
        );
    }

    if (payload.eventType === 'document_access' && payload.metadata?.documentId) {
        const docId = payload.metadata.documentId as string;
        // Upsert in document access patterns
        const existing = await Personalization.findOne({
            userId: user._id,
            'documentAccessPatterns.documentId': docId,
        });

        if (existing) {
            await Personalization.updateOne(
                { userId: user._id, 'documentAccessPatterns.documentId': docId },
                {
                    $inc: { 'documentAccessPatterns.$.accessCount': 1 },
                    $set: { 'documentAccessPatterns.$.lastAccessed': new Date() },
                },
            );
        } else {
            await Personalization.findOneAndUpdate(
                { userId: user._id },
                {
                    $push: {
                        documentAccessPatterns: {
                            documentId: docId,
                            accessCount: 1,
                            lastAccessed: new Date(),
                        },
                    },
                },
                { upsert: true },
            );
        }
    }

    return { tracked: true };
};

// Get search history
const getSearchHistory = async (userId: string, limit = 20) => {
    const personalization = await getOrCreatePersonalization(userId);
    return personalization.searchHistory.slice(-limit).reverse();
};

// Get document access patterns
const getDocumentAccessPatterns = async (userId: string, limit = 20) => {
    const personalization = await getOrCreatePersonalization(userId);
    return personalization.documentAccessPatterns
        .sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime())
        .slice(0, limit);
};

export const PersonalizationService = {
    getPersonalization,
    updatePersonalization,
    trackBehavior,
    getSearchHistory,
    getDocumentAccessPatterns,
};
