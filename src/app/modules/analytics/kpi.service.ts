/**
 * @fileoverview KPI Service for registration and revenue analytics.
 * Provides privacy-safe event aggregation for WBS-SM-KPI-01 and WBS-SM-KPI-06.
 */
import { User } from '../user/user.model';
import { Payment } from '../payment/payment.model';
import { Subscription } from '../subscription/subscription.model';

/**
 * Registration KPI Instrumentation (WBS-SM-KPI-01).
 * Returns registration trends over the last 30 days, broken down by day.
 */
const getRegistrationKPIs = async () => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [totalRegistrations, dailyTrend, registrationsByRole] = await Promise.all([
    User.countDocuments({ createdAt: { $gte: thirtyDaysAgo }, isDeleted: false }),
    User.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo }, isDeleted: false } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    User.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo }, isDeleted: false } },
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]),
  ]);

  const byRole: Record<string, number> = {};
  registrationsByRole.forEach((r: any) => {
    byRole[r._id || 'unknown'] = r.count;
  });

  return {
    period: '30d',
    totalRegistrations,
    dailyTrend: dailyTrend.map((d: any) => ({ date: d._id, count: d.count })),
    byRole,
  };
};

/**
 * Revenue KPI Instrumentation (WBS-SM-KPI-06).
 * Returns revenue metrics over the last 30 days.
 */
const getRevenueKPIs = async () => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    totalRevenue,
    activeSubscriptions,
    dailyRevenue,
    revenueByPlan,
  ] = await Promise.all([
    Payment.aggregate([
      { $match: { status: 'succeeded', createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Subscription.countDocuments({ status: { $in: ['active', 'trialing'] } }),
    Payment.aggregate([
      { $match: { status: 'succeeded', createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Subscription.aggregate([
      { $match: { status: { $in: ['active', 'trialing'] } } },
      { $group: { _id: '$plan', count: { $sum: 1 } } },
    ]),
  ]);

  const byPlan: Record<string, number> = {};
  revenueByPlan.forEach((r: any) => {
    byPlan[r._id || 'unknown'] = r.count;
  });

  return {
    period: '30d',
    totalRevenueCents: totalRevenue[0]?.total || 0,
    activeSubscriptions,
    dailyRevenue: dailyRevenue.map((d: any) => ({
      date: d._id,
      totalCents: d.total,
      transactions: d.count,
    })),
    subscriptionsByPlan: byPlan,
  };
};

export const KPIService = {
  getRegistrationKPIs,
  getRevenueKPIs,
};
