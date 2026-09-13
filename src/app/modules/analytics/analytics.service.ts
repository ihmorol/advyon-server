/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import AppError from '../../errors/appError';
import { User } from '../user/user.model';
import { Case } from '../case/case.model';

/**
 * WBS-8.1: Analytics Service
 * Provides comprehensive analytics for the dashboard.
 */

// Get case resolution time metrics
const getCaseMetrics = async (userId: string, startDate?: string, endDate?: string) => {
    const user = await User.findOne({ id: userId });
    if (!user) {
        throw new AppError(httpStatus.NOT_FOUND, 'User not found');
    }

    const dateFilter: any = { createdBy: user._id, isDeleted: { $ne: true } };
    if (startDate || endDate) {
        dateFilter.createdAt = {};
        if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
        if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    const [totalCases, activeCases, closedCases, archivedCases] = await Promise.all([
        Case.countDocuments(dateFilter),
        Case.countDocuments({ ...dateFilter, status: 'active' }),
        Case.countDocuments({ ...dateFilter, status: 'closed' }),
        Case.countDocuments({ ...dateFilter, status: 'archived' }),
    ]);

    // Case distribution by type
    const caseDistribution = await Case.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$caseType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
    ]);

    // Urgency distribution
    const urgencyDistribution = await Case.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$urgency', count: { $sum: 1 } } },
    ]);

    // Monthly case creation trend (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthlyTrend = await Case.aggregate([
        { $match: { ...dateFilter, createdAt: { $gte: twelveMonthsAgo } } },
        {
            $group: {
                _id: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                },
                count: { $sum: 1 },
            },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    return {
        summary: { totalCases, activeCases, closedCases, archivedCases },
        caseDistribution: caseDistribution.map((d) => ({ type: d._id, count: d.count })),
        urgencyDistribution: urgencyDistribution.map((d) => ({ urgency: d._id, count: d.count })),
        monthlyTrend: monthlyTrend.map((d) => ({
            month: `${d._id.year}-${String(d._id.month).padStart(2, '0')}`,
            count: d.count,
        })),
    };
};

// Get client metrics
const getClientMetrics = async (userId: string, startDate?: string, endDate?: string) => {
    const user = await User.findOne({ id: userId });
    if (!user) {
        throw new AppError(httpStatus.NOT_FOUND, 'User not found');
    }

    const dateFilter: any = {};
    if (startDate || endDate) {
        dateFilter.createdAt = {};
        if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
        if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    const totalClients = await User.countDocuments({
        role: 'client',
        isDeleted: { $ne: true },
        ...dateFilter,
    });

    const activeClients = await User.countDocuments({
        role: 'client',
        status: 'active',
        isDeleted: { $ne: true },
        ...dateFilter,
    });

    return {
        totalClients,
        activeClients,
        retentionRate: totalClients > 0 ? Math.round((activeClients / totalClients) * 100) : 0,
    };
};

// Get upcoming deadlines
const getUpcomingDeadlines = async (userId: string, limit = 10) => {
    const user = await User.findOne({ id: userId });
    if (!user) {
        throw new AppError(httpStatus.NOT_FOUND, 'User not found');
    }

    const now = new Date();
    const deadlines = await Case.find({
        createdBy: user._id,
        isDeleted: { $ne: true },
        status: { $ne: 'archived' },
        nextDeadline: { $gte: now },
    })
        .select('id title caseNumber nextDeadline nextDeadlineDescription urgency status')
        .sort({ nextDeadline: 1 })
        .limit(limit);

    return deadlines.map((c) => ({
        caseId: c.id,
        title: c.title,
        caseNumber: c.caseNumber,
        deadline: c.nextDeadline,
        description: c.nextDeadlineDescription,
        urgency: c.urgency,
        status: c.status,
    }));
};

// Revenue tracking (stub — no billing model yet)
const getRevenueMetrics = async (_userId: string, _startDate?: string, _endDate?: string) => {
    // Stub: Revenue tracking requires billing integration
    return {
        totalRevenue: 0,
        monthlyRecurring: 0,
        outstanding: 0,
        note: 'Revenue tracking requires billing system integration (incomplete — needs credentials/infra)',
    };
};

export const AnalyticsService = {
    getCaseMetrics,
    getClientMetrics,
    getUpcomingDeadlines,
    getRevenueMetrics,
};
