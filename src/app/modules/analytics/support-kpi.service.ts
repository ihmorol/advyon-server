import httpStatus from 'http-status';
import AppError from '../../errors/appError';
import config from '../../config';
import { SupportTicketMetric } from './support-ticket-metric.model';

interface RecordTicketPayload {
  topicKey?: string;
  urgencyKey?: string;
  source?: string;
}

const normalizeKey = (value: string | undefined, fallback: string) =>
  (value?.toLowerCase().replace(/[^a-z0-9\-]/g, '-') || fallback).replace(/-+/g, '-');

const todayKey = () => new Date().toISOString().slice(0, 10);

const isEnabled = () => config.support_kpi_enabled !== 'false';

const recordTicket = async (payload: RecordTicketPayload) => {
  if (!isEnabled()) return null;

  const date = todayKey();
  const topicKey = normalizeKey(payload.topicKey, 'general');
  const urgencyKey = normalizeKey(payload.urgencyKey, 'standard');
  const sourceKey = normalizeKey(payload.source || 'public-site', 'public-site');

  await SupportTicketMetric.findOneAndUpdate(
    { date },
    {
      $setOnInsert: { date },
      $inc: {
        totalTickets: 1,
        [`countsByTopic.${topicKey}`]: 1,
        [`countsByUrgency.${urgencyKey}`]: 1,
        [`countsBySource.${sourceKey}`]: 1,
      },
    },
    { upsert: true, new: true },
  );
};

const toArray = (map: Record<string, number> = {}) =>
  Object.entries(map).map(([key, count]) => ({
    key,
    count: typeof count === 'number' ? count : Number(count),
  }));

const getSupportTicketKpis = async (rangeDays = 30) => {
  if (!Number.isFinite(rangeDays) || rangeDays <= 0) {
    throw new AppError(httpStatus.BAD_REQUEST, 'rangeDays must be positive');
  }

  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - (rangeDays - 1));
  const startKey = start.toISOString().slice(0, 10);

  const metrics = await SupportTicketMetric.find({
    date: { $gte: startKey },
  })
    .sort({ date: 1 })
    .lean();

  const totalTickets = metrics.reduce((sum, metric) => sum + (metric.totalTickets || 0), 0);
  const combineMaps = (field: 'countsByTopic' | 'countsByUrgency' | 'countsBySource') => {
    const map: Record<string, number> = {};
    metrics.forEach(metric => {
      const data = (metric as any)[field] || {};
      Object.entries(data).forEach(([key, count]) => {
        map[key] = (map[key] || 0) + Number(count);
      });
    });
    return map;
  };

  return {
    period: `${rangeDays}d`,
    totalTickets,
    byTopic: toArray(combineMaps('countsByTopic')),
    byUrgency: toArray(combineMaps('countsByUrgency')),
    bySource: toArray(combineMaps('countsBySource')),
    dailyTrend: metrics.map(metric => ({
      date: metric.date,
      count: metric.totalTickets || 0,
    })),
  };
};

export const SupportKpiService = {
  recordTicket,
  getSupportTicketKpis,
  isEnabled,
};
