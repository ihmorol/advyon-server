import { Model, Types } from 'mongoose';

export type TEventType = 'hearing' | 'meeting' | 'filing' | 'deadline' | 'other';
export type TEventStatus = 'scheduled' | 'completed' | 'cancelled' | 'postponed';

export interface ISchedule {
  title: string;
  description?: string;
  eventType: TEventType;
  date: Date;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  location?: string;

  caseId: Types.ObjectId;
  participants: Types.ObjectId[]; // User IDs (lawyers, clients)
  createdBy: Types.ObjectId;

  status: TEventStatus;

  reminders: {
    time: number; // minutes before
    sent: boolean;
  }[];

  metadata?: Record<string, any>;

  // WBS-6.1 additions
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: Date;
    daysOfWeek?: number[];
  };
  parentEventId?: Types.ObjectId;
  resourceId?: string;
  googleCalendarEventId?: string; // BL: needs Google credentials

  createdAt: Date;
  updatedAt: Date;
}

export type ScheduleModel = Model<ISchedule>;
