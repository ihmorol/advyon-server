import express from 'express';
import auth from '../../middlewares/auth';
import { ChatControllers } from './chat.controller';

const router = express.Router();

/**
 * @swagger
 * /api/v1/chat/conversations:
 *   post:
 *     summary: Get or create a conversation with another user
 *     tags: [Chat]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               otherUserId:
 *                 type: string
 *                 description: The ID of the other user
 */
router.post(
  '/conversations',
  auth(),
  ChatControllers.getOrCreateConversation
);

/**
 * @swagger
 * /api/v1/chat/conversations:
 *   get:
 *     summary: Get all conversations for the current user
 *     tags: [Chat]
 *     security: [{ bearerAuth: [] }]
 */
router.get(
  '/conversations',
  auth(),
  ChatControllers.getConversations
);

/**
 * @swagger
 * /api/v1/chat/conversations/{id}/messages:
 *   get:
 *     summary: Get messages for a conversation
 *     tags: [Chat]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 */
router.get(
  '/conversations/:id/messages',
  auth(),
  ChatControllers.getMessages
);

/**
 * @swagger
 * /api/v1/chat/conversations/{id}/messages:
 *   post:
 *     summary: Send a message in a conversation
 *     tags: [Chat]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 */
router.post(
  '/conversations/:id/messages',
  auth(),
  ChatControllers.sendMessage
);

/**
 * @swagger
 * /api/v1/chat/conversations/{id}/read:
 *   patch:
 *     summary: Mark all messages in a conversation as read
 *     tags: [Chat]
 *     security: [{ bearerAuth: [] }]
 */
router.patch(
  '/conversations/:id/read',
  auth(),
  ChatControllers.markAsRead
);

export const ChatRoutes = router;
