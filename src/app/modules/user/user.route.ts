/* eslint-disable @typescript-eslint/no-explicit-any */
import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { UserControllers } from './user.controller';
import { UserValidation } from './user.validation';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management
 */

/**
 * @swagger
 * /users/create-user:
 *   post:
 *     summary: Create a new user
 *     description: Creates a new user in the system.
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *     responses:
 *       200:
 *         description: User created successfully
 */
router.post(
  '/create-user',
  auth('admin', 'superAdmin'),
  validateRequest(UserValidation.createUserValidationSchema),
  UserControllers.createUser,
);

/**
 * @swagger
 * /users/me/profile:
 *   get:
 *     summary: Get my profile
 *     description: Retrieves the profile of the logged-in user including role for sidebar rendering.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User profile retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: CLI-0001
 *                     email:
 *                       type: string
 *                       example: user@example.com
 *                     fullName:
 *                       type: string
 *                       example: John Doe
 *                     displayName:
 *                       type: string
 *                       example: JD
 *                     role:
 *                       type: string
 *                       enum: [client, lawyer, judge, admin, superAdmin]
 *                       description: User role for sidebar rendering
 *                       example: client
 *                     status:
 *                       type: string
 *                       enum: [in-progress, active, inactive, blocked]
 *                       example: active
 *                     avatarUrl:
 *                       type: string
 *                       format: uri
 *                       example: https://example.com/avatar.jpg
 *                     preferredLanguage:
 *                       type: string
 *                       example: en
 *                     timezone:
 *                       type: string
 *                       example: UTC
 *                     isEmailVerified:
 *                       type: boolean
 *                       example: true
 *                     phone:
 *                       type: string
 *                       example: +8801712345678
 *                     address:
 *                       type: string
 *                       example: 123 Main St
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.get(
  '/me/profile',
  auth(),
  UserControllers.getMyProfile,
);

/**
 * @swagger
 * /users/my-clients:
 *   get:
 *     summary: Get my clients (Lawyer only)
 *     description: Retrieves a list of clients associated with the logged-in lawyer's cases.
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Clients retrieved successfully
 */
router.get(
  '/my-clients',
  auth('lawyer', 'admin', 'superAdmin'),
  UserControllers.getLawyerClients,
);

/**
 * @swagger
 * /users/clients/{id}:
 *   get:
 *     summary: Get client details (Lawyer only)
 *     description: Retrieves detailed client info, associated cases, and billing stats.
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Client details retrieved
 */
router.get(
  '/clients/:id',
  auth('lawyer', 'admin', 'superAdmin'),
  UserControllers.getClientDetail
);

/**
 * @swagger
 * /users/clients/{id}:
 *   delete:
 *     summary: Archive client (Lawyer only)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Client archived
 */
router.delete(
  '/clients/:id',
  auth('lawyer', 'admin', 'superAdmin'),
  UserControllers.archiveClient
);

/**
 * @swagger
 * /users/me/profile:
 *   patch:
 *     summary: Update my profile
 *     description: Updates the profile of the logged-in user. Email cannot be changed.
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               displayName:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               avatarUrl:
 *                 type: string
 *               bio:
 *                 type: string
 *               timezone:
 *                 type: string
 *               preferredLanguage:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.patch(
  '/me/profile',
  auth(),
  UserControllers.updateMyProfile,
);

/**
 * @swagger
 * /users/lawyer/verify-request:
 *   post:
 *     summary: Submit lawyer verification request
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               barRegistrationNumber:
 *                 type: string
 *               barCouncilName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Verification submitted
 */
router.post(
  '/lawyer/verify-request',
  auth('lawyer'),
  UserControllers.submitVerificationRequest,
);

/**
 * @swagger
 * /users/me/change-password:
 *   post:
 *     summary: Change password
 *     description: Changes the password of the logged-in user.
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       401:
 *         description: Current password is incorrect
 */
router.post(
  '/me/change-password',
  auth(),
  UserControllers.changePassword,
);

/**
 * @swagger
 * /users/me/preferences:
 *   get:
 *     summary: Get my preferences
 *     description: Retrieves user preferences (theme, notifications, dashboard config)
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Preferences retrieved successfully
 */
router.get(
  '/me/preferences',
  auth(),
  UserControllers.getMyPreferences,
);

/**
 * @swagger
 * /users/me/preferences:
 *   patch:
 *     summary: Update my preferences
 *     description: Updates user preferences (theme, notifications, dashboard config)
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               theme:
 *                 type: string
 *                 enum: [light, dark, system]
 *               notifications:
 *                 type: object
 *               dashboardConfig:
 *                 type: object
 *     responses:
 *       200:
 *         description: Preferences updated successfully
 */
router.patch(
  '/me/preferences',
  auth(),
  UserControllers.updateMyPreferences,
);

// WBS-4.1: Personalization routes
router.get(
  '/me/personalization',
  auth(),
  UserControllers.getPersonalization,
);

router.put(
  '/me/personalization',
  auth(),
  UserControllers.updatePersonalization,
);

router.post(
  '/me/behavior',
  auth(),
  UserControllers.trackBehavior,
);

/**
 * @swagger
 * /users/lawyers:
 *   get:
 *     summary: Get all lawyers (Lawyer Directory)
 *     description: Retrieves a list of lawyers with their profiles for the lawyer directory. Supports search, practiceArea filter, and pagination.
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by lawyer name
 *       - in: query
 *         name: practiceArea
 *         schema: { type: string }
 *         description: Filter by practice area
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 12 }
 *     responses:
 *       200:
 *         description: Lawyers retrieved successfully
 */
router.get(
  '/lawyers',
  auth(),
  UserControllers.getAllLawyers,
);

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     description: Retrieves a list of all users.
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 */
router.get(
  '/',
  auth('admin', 'superAdmin'),
  validateRequest(UserValidation.queryUserValidation),
  UserControllers.getAllUsers,
);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get a single user by ID
 *     description: Retrieves a single user's details by their ID.
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User found
 *       404:
 *         description: User not found
 */
router.get(
  '/:id',
  auth(),
  UserControllers.getSingleUser,
);

/**
 * @swagger
 * /users/{id}:
 *   patch:
 *     summary: Update a user
 *     description: Updates a user's details by their ID.
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated successfully
 */
router.patch(
  '/:id',
  auth('admin', 'superAdmin'),
  validateRequest(UserValidation.updateUserValidationSchema),
  UserControllers.updateUser,
);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete a user
 *     description: Deletes a user from the system by their ID.
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 */
router.delete(
  '/:id',
  auth('admin', 'superAdmin'),
  UserControllers.deleteUser,
);

export const UserRoutes = router;
