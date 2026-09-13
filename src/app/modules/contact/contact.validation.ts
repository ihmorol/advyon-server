import { z } from 'zod';

const attachmentSchema = z.object({
  label: z.string().max(120),
  url: z.string().url(),
});

const contactFormSchema = z.object({
  fullName: z.string().min(3).max(140),
  email: z.string().email(),
  orgName: z.string().max(160).optional(),
  role: z.string().max(120).optional(),
  phone: z.string().max(40).optional(),
  topicKey: z.string().min(2).max(120),
  urgencyKey: z.string().min(2).max(120),
  message: z.string().min(20).max(2000),
  attachments: z.array(attachmentSchema).max(3).optional(),
});

export const ContactValidation = {
  submit: z.object({
    body: contactFormSchema,
  }),
};
