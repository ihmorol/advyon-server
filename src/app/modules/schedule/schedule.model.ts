import { Schema, model } from 'mongoose';
import { ISchedule, ScheduleModel } from './schedule.interface';

const scheduleSchema = new Schema<ISchedule, ScheduleModel>(
  {
    title: { type: String, required: true },
    description: { type: String },
    eventType: {
      type: String,
      enum: ['hearing', 'meeting', 'filing', 'deadline', 'other'],
      required: true,
    },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    location: { type: String },

    caseId: { type: Schema.Types.ObjectId, ref: 'Case', required: true },
    participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'postponed'],
      default: 'scheduled',
    },

    reminders: [{
      time: { type: Number },
      sent: { type: Boolean, default: false }
    }],

    // WBS-6.1: Recurring events
    recurrence: {
      frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly'] },
      interval: { type: Number, default: 1 },
      endDate: { type: Date },
      daysOfWeek: [{ type: Number }],
    },
    parentEventId: { type: Schema.Types.ObjectId, ref: 'Schedule' },

    // WBS-6.1: Resource booking
    resourceId: { type: String },

    // WBS-6.1: Google Calendar sync (BL: needs credentials)
    googleCalendarEventId: { type: String },

    metadata: { type: Map, of: String }
  },
  {
    timestamps: true,
  }
);

// Indexes for common queries
scheduleSchema.index({ caseId: 1 });
scheduleSchema.index({ date: 1 });
scheduleSchema.index({ participants: 1 });
scheduleSchema.index({ 'recurrence.frequency': 1 });
scheduleSchema.index({ resourceId: 1, date: 1 });

export const Schedule = model<ISchedule, ScheduleModel>('Schedule', scheduleSchema);
