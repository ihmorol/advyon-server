import express from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { contactRateLimiter } from '../../middlewares/rateLimiter';
import { ContactController } from './contact.controller';
import { ContactValidation } from './contact.validation';

const router = express.Router();

router.get('/meta', ContactController.getContactMetadata);

router.post(
  '/',
  contactRateLimiter,
  validateRequest(ContactValidation.submit),
  ContactController.submitContactRequest,
);

export const ContactRoutes = router;
