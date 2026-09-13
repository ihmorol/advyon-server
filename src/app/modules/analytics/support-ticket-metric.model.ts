import { Schema, model } from 'mongoose';

interface ISupportTicketMetric {
  date: string;
  totalTickets: number;
  countsByUrgency: Record<string, number>;
  countsByTopic: Record<string, number>;
  countsBySource: Record<string, number>;
  updatedAt?: Date;
  createdAt?: Date;
}

const breakdownMap = {
  type: Map,
  of: Number,
  default: {},
};

const supportTicketMetricSchema = new Schema<ISupportTicketMetric>(
  {
    date: { type: String, required: true, unique: true },
    totalTickets: { type: Number, default: 0 },
    countsByUrgency: breakdownMap,
    countsByTopic: breakdownMap,
    countsBySource: breakdownMap,
  },
  { timestamps: true },
);

export const SupportTicketMetric = model<ISupportTicketMetric>(
  'SupportTicketMetric',
  supportTicketMetricSchema,
);
