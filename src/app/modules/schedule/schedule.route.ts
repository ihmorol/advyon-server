import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { ScheduleValidation } from './schedule.validation';
import { ScheduleControllers } from './schedule.controller';

const router = express.Router();

router.post(
  '/',
  auth(),
  validateRequest(ScheduleValidation.createEventValidation),
  ScheduleControllers.createEvent
);

router.get(
  '/',
  auth(),
  validateRequest(ScheduleValidation.queryEventValidation),
  ScheduleControllers.getAllEvents
);

// Conflict check endpoint
router.get(
  '/conflicts',
  auth(),
  validateRequest(ScheduleValidation.conflictCheckValidation),
  ScheduleControllers.checkConflict
);

router.get(
  '/today',
  auth(),
  ScheduleControllers.getTodaySchedule
);

router.get(
  '/:id',
  auth(),
  ScheduleControllers.getEventById
);

router.patch(
  '/:id',
  auth(),
  validateRequest(ScheduleValidation.updateEventValidation),
  ScheduleControllers.updateEvent
);

router.delete(
  '/:id',
  auth(),
  ScheduleControllers.deleteEvent
);

export const ScheduleRoutes = router;
