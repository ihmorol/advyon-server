import { z } from 'zod';

// Regex to reject emoji characters in name fields
const noEmoji = /^[^\p{Emoji_Presentation}\p{Extended_Pictographic}]*$/u;
import { UserStatus } from './user.constant';

const createClientProfileValidationSchema = z.object({
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
});

const createLawyerProfileValidationSchema = z.object({
  barRegistrationNumber: z.string(),
  barCouncilName: z.string(),
  yearsOfExperience: z.number(),
  primaryPracticeArea: z.string().optional(),
  verificationNotes: z.string().optional(),
});

const createJudgeProfileValidationSchema = z.object({
  courtName: z.string(),
  designation: z.string(),
});

const createUserValidationSchema = z.object({
  body: z.object({
    password: z.string().optional(),
    user: z.object({
      email: z.string().email(),
      fullName: z.string().regex(noEmoji, 'Name cannot contain emoji'),
      role: z.enum(['superAdmin', 'student', 'admin', 'client', 'lawyer', 'judge']),
      status: z.enum([...UserStatus] as [string, ...string[]]).optional(),
    }),
    client: createClientProfileValidationSchema.optional(),
    lawyer: createLawyerProfileValidationSchema.optional(),
    judge: createJudgeProfileValidationSchema.optional(),
  }),
});

const updateUserValidationSchema = z.object({
  body: z.object({
    user: z.object({
      email: z.string().email().optional(),
      fullName: z.string().regex(noEmoji, 'Name cannot contain emoji').optional(),
      role: z.enum(['superAdmin', 'student', 'admin', 'client', 'lawyer', 'judge']).optional(),
      status: z.enum([...UserStatus] as [string, ...string[]]).optional(),
    }).optional(),
    client: createClientProfileValidationSchema.optional(),
    lawyer: createLawyerProfileValidationSchema.partial().optional(),
    judge: createJudgeProfileValidationSchema.partial().optional(),
  }),
});

// Query schema for GET /users — allowlists the plain-string filter fields the
// query builder consumes (searchTerm/page/limit/sort/fields) plus the user
// filter fields (role/status). `.strict()` rejects any other key so that
// operator/objects (e.g. ?password[$ne]=...) never reach User.find().
const queryUserValidation = z.object({
  query: z
    .object({
      searchTerm: z.string().optional(),
      page: z.string().optional(),
      limit: z.string().optional(),
      sort: z.string().optional(),
      fields: z.string().optional(),
      role: z.string().optional(),
      status: z.string().optional(),
    })
    .strict(),
});

export const UserValidation = {
  createUserValidationSchema,
  updateUserValidationSchema,
  queryUserValidation,
};
