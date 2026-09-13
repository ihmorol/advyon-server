/* eslint-disable @typescript-eslint/no-explicit-any */
import express from 'express';
import auth from '../../middlewares/auth';
import { MessageControllers } from './message.controller';
// Add validation middleware once schemas are ready for new features

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Messages
 *   description: Messaging system
 */

// Get threads for a specific case
router.get(
  '/case/:caseId',
  auth(),
  MessageControllers.getCaseThreads
);

router.get(
  '/pending/count',
  auth(),
  MessageControllers.getPendingCount,
);

router.get(
  '/',
  auth(),
  MessageControllers.getMessagesForUser,
);

router.post(
  '/',
  auth(),
  // Add validation
  MessageControllers.createMessage,
);

router.get(
  '/:id',
  auth(),
  MessageControllers.getMessageById,
);

router.patch(
  '/:id/read',
  auth(),
  MessageControllers.markAsRead,
);

router.patch(
  '/:id/star',
  auth(),
  MessageControllers.toggleStar,
);

router.delete(
  '/:id',
  auth(),
  MessageControllers.archiveMessage,
);

export const MessageRoutes = router;
