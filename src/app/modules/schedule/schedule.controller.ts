import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ScheduleService } from './schedule.service';

/**
 * WBS-6.1: Schedule Controller
 * Enhanced with conflict detection and recurrence support.
 */

const createEvent = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const result = await ScheduleService.createEvent({
    ...req.body,
    createdBy: userId,
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Event created successfully',
    data: result,
  });
});

const getAllEvents = catchAsync(async (req, res) => {
  const { userId } = req.user;
  // If user is client, strict filter? If lawyer, maybe all?
  // Current service enforces filtering by userId if passed in query, or we enforce it here.
  // Let's pass userId to service to handle access logic or filtering.
  const query = { ...req.query, userId };

  const result = await ScheduleService.getAllEvents(query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Events retrieved successfully',
    data: result,
  });
});

const getEventById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await ScheduleService.getEventById(id);

  if (!result) {
    // Return 404
    // We could throw here but service returns null
    return sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: 'Event not found',
      data: null
    });
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Event retrieved successfully',
    data: result,
  });
});

const updateEvent = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await ScheduleService.updateEvent(id, req.body);

  if (!result) {
    return sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: 'Event not found',
      data: null
    });
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Event updated successfully',
    data: result,
  });
});

const deleteEvent = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await ScheduleService.deleteEvent(id);

  if (!result) {
    return sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: 'Event not found',
      data: null
    });
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Event deleted successfully',
    data: result,
  });
});

const getTodaySchedule = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const result = await ScheduleService.getTodaySchedule(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Today's schedule retrieved successfully",
    data: result,
  });
});

const checkConflict = catchAsync(async (req, res) => {
  const { userId } = req.user;
  const { date, startTime, endTime } = req.query; // Validated by Zod schema

  const hasConflict = await ScheduleService.checkConflict(
    userId,
    new Date(date as string),
    startTime as string,
    endTime as string
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: hasConflict ? 'Conflict detected' : 'No conflict',
    data: { hasConflict }
  });
});

export const ScheduleControllers = {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getTodaySchedule,
  checkConflict
};
