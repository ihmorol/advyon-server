import httpStatus from 'http-status';
import AppError from '../../errors/appError';
import { Schedule } from './schedule.model';
import { ISchedule } from './schedule.interface';
import { FilterQuery, Types } from 'mongoose';
import { User } from '../user/user.model';
import { Case } from '../case/case.model';

/**
 * WBS-6.1: Schedule Service
 * Enhanced with conflict detection and recurrence generation.
 */

const checkConflict = async (
  userId: string,
  date: Date,
  startTime: string,
  endTime: string,
  excludeEventId?: string
): Promise<boolean> => {
  const participantId = await resolveUserObjectId(userId);

  const query: FilterQuery<ISchedule> = {
    participants: participantId,
    date: date,
    status: { $ne: 'cancelled' },
    $or: [
      {
        startTime: { $lt: endTime },
        endTime: { $gt: startTime },
      },
    ],
  };

  if (excludeEventId) {
    query._id = { $ne: excludeEventId };
  }

  const conflict = await Schedule.findOne(query);
  return !!conflict;
};

const generateRecurringInstances = (originalPayload: ISchedule): Partial<ISchedule>[] => {
  const instances: Partial<ISchedule>[] = [];
  const { recurrence, date } = originalPayload;

  if (!recurrence || !recurrence.endDate) return instances;

  const startDate = new Date(date);
  const endDate = new Date(recurrence.endDate);
  const interval = recurrence.interval || 1;
  const frequency = recurrence.frequency;

  let currentDate = new Date(startDate);
  // Start from next occurrence
  if (frequency === 'daily') currentDate.setDate(currentDate.getDate() + interval);
  if (frequency === 'weekly') currentDate.setDate(currentDate.getDate() + (7 * interval));
  if (frequency === 'monthly') currentDate.setMonth(currentDate.getMonth() + interval);
  if (frequency === 'yearly') currentDate.setFullYear(currentDate.getFullYear() + interval);

  while (currentDate <= endDate) {
    instances.push({
      ...originalPayload,
      date: new Date(currentDate),
      parentEventId: undefined, // Will be set after parent creation if needed, or we link them differently
      // Ideally, we link to the first event or a unique series ID
    });

    if (frequency === 'daily') currentDate.setDate(currentDate.getDate() + interval);
    if (frequency === 'weekly') currentDate.setDate(currentDate.getDate() + (7 * interval));
    if (frequency === 'monthly') currentDate.setMonth(currentDate.getMonth() + interval);
    if (frequency === 'yearly') currentDate.setFullYear(currentDate.getFullYear() + interval);
  }

  return instances;
};

const resolveUserObjectId = async (userIdentifier: string) => {
  const user = Types.ObjectId.isValid(userIdentifier)
    ? await User.findById(userIdentifier)
    : await User.findOne({ id: userIdentifier });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  return user._id;
};

const resolveCaseObjectId = async (caseIdentifier: string) => {
  const caseData = Types.ObjectId.isValid(caseIdentifier)
    ? await Case.findById(caseIdentifier)
    : await Case.findOne({ id: caseIdentifier });

  if (!caseData) {
    throw new AppError(httpStatus.NOT_FOUND, 'Case not found');
  }

  return caseData._id;
};

const createEvent = async (payload: ISchedule): Promise<ISchedule> => {
  const createdById = await resolveUserObjectId(payload.createdBy as unknown as string);
  const caseObjectId = await resolveCaseObjectId(payload.caseId as unknown as string);

  const normalizedParticipants = await Promise.all(
    (payload.participants || []).map((participant) =>
      resolveUserObjectId(participant as unknown as string),
    ),
  );

  if (!normalizedParticipants.some((participant) => participant.equals(createdById))) {
    normalizedParticipants.push(createdById);
  }

  const normalizedPayload: ISchedule = {
    ...payload,
    createdBy: createdById as any,
    caseId: caseObjectId as any,
    participants: normalizedParticipants as any,
  };

  // 1. Check conflicts for the main participant (creator)
  // strict conflict check can be optional based on preferences, but let's enforce it for main user
  const hasConflict = await checkConflict(
    String(createdById),
    new Date(normalizedPayload.date),
    normalizedPayload.startTime,
    normalizedPayload.endTime
  );

  if (hasConflict) {
    throw new AppError(httpStatus.CONFLICT, 'User has a schedule conflict at this time');
  }

  // 2. Create the main event
  const event = await Schedule.create(normalizedPayload);

  // 3. Handle recurrence
  if (normalizedPayload.recurrence) {
    const instances = generateRecurringInstances(normalizedPayload);
    if (instances.length > 0) {
      const instancesWithParent = instances.map(i => ({
        ...i,
        parentEventId: event._id,
      }));
      await Schedule.insertMany(instancesWithParent);
    }
  }

  return event;
};

const getAllEvents = async (query: Record<string, unknown>): Promise<ISchedule[]> => {
  const { caseId, startDate, endDate, userId } = query;

  const filter: FilterQuery<ISchedule> = {};

  if (caseId) filter.caseId = caseId;
  if (userId) {
    const participantId = await resolveUserObjectId(String(userId));
    filter.participants = participantId;
  }
  if (startDate && endDate) {
    filter.date = {
      $gte: new Date(startDate as string),
      $lte: new Date(endDate as string)
    };
  }

  const result = await Schedule.find(filter)
    .populate('caseId', 'title ref')
    .populate('participants', 'fullName email') // Fixed: name -> fullName
    .sort({ date: 1, startTime: 1 });

  return result;
};

const getEventById = async (id: string): Promise<ISchedule | null> => {
  const result = await Schedule.findById(id)
    .populate('caseId', 'title ref')
    .populate('participants', 'fullName email');
  return result;
};

const updateEvent = async (id: string, payload: Partial<ISchedule>): Promise<ISchedule | null> => {
  // If verifying conflict on update
  if (payload.date && payload.startTime && payload.endTime) {
    // Check conflict logic here if needed
  }

  const result = await Schedule.findByIdAndUpdate(id, payload, { new: true });
  return result;
};

const deleteEvent = async (id: string): Promise<ISchedule | null> => {
  const result = await Schedule.findByIdAndDelete(id);
  // Optional: delete future recurring instances?
  // await Schedule.deleteMany({ parentEventId: id, date: { $gt: new Date() } });
  return result;
};

const getTodaySchedule = async (userId: string): Promise<ISchedule[]> => {
  const participantId = await resolveUserObjectId(userId);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const result = await Schedule.find({
    participants: participantId,
    date: {
      $gte: startOfDay,
      $lte: endOfDay
    },
    status: { $ne: 'cancelled' }
  })
    .populate('caseId', 'title ref')
    .sort({ startTime: 1 });

  return result;
};

export const ScheduleService = {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getTodaySchedule,
  checkConflict // Exported for controller usage if needed
};
