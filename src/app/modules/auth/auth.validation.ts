import { z } from 'zod';

// Regex to reject emoji characters in name fields
const noEmoji = /^[^\p{Emoji_Presentation}\p{Extended_Pictographic}]*$/u;

// Regex for valid phone number characters (digits, +, -, spaces, parentheses)
const validPhone = /^[\d\s+\-()]*$/;

// Sync user validation (no body needed, data from JWT)
const syncUserValidation = z.object({
  body: z.object({}).optional(),
});

// Onboarding validation with conditional role-based requirements
const onboardValidation = z.object({
  body: z
    .object({
      role: z.enum(['client', 'lawyer', 'judge'], {
        required_error: 'Role is required',
      }),
      profile: z.object({
        // Common fields
        fullName: z.string({
          required_error: 'Full name is required',
        }).regex(noEmoji, 'Name cannot contain emoji'),
        displayName: z.string().regex(noEmoji, 'Display name cannot contain emoji').optional(),
        phone: z.string().regex(validPhone, 'Phone number can only contain digits, +, -, spaces, and parentheses').optional(),
        avatarUrl: z.string().url().optional(),
        preferredLanguage: z.string().optional(),
        timezone: z.string().optional(),

        // Client-specific fields
        address: z.string().optional(),

        // Lawyer-specific fields
        barRegistrationNumber: z.string().optional(),
        barCouncilName: z.string().optional(),
        yearsOfExperience: z.number().int().min(0).optional(),
        primaryPracticeArea: z.string().optional(),

        // Judge-specific fields
        courtName: z.string().optional(),
        designation: z.string().optional(),
      }),
    })
    .refine(
      (data) => {
        // Validate lawyer-specific required fields
        if (data.role === 'lawyer') {
          return (
            data.profile.barRegistrationNumber &&
            data.profile.barCouncilName &&
            data.profile.yearsOfExperience !== undefined &&
            data.profile.primaryPracticeArea
          );
        }
        return true;
      },
      {
        message:
          'Bar registration number, bar council name, years of experience, and primary practice area are required for lawyers',
        path: ['profile'],
      },
    )
    .refine(
      (data) => {
        // Validate judge-specific required fields
        if (data.role === 'judge') {
          return data.profile.courtName && data.profile.designation;
        }
        return true;
      },
      {
        message: 'Court name and designation are required for judges',
        path: ['profile'],
      },
    ),
});

// Update profile validation (all fields optional)
const updateProfileValidation = z.object({
  body: z.object({
    // User table fields
    fullName: z.string().regex(noEmoji, 'Name cannot contain emoji').optional(),
    displayName: z.string().regex(noEmoji, 'Display name cannot contain emoji').optional(),
    avatarUrl: z.string().url().optional(),
    preferredLanguage: z.string().optional(),
    timezone: z.string().optional(),

    // Profile fields (role-specific)
    phone: z.string().regex(validPhone, 'Phone number can only contain digits, +, -, spaces, and parentheses').optional(),
    address: z.string().optional(),
    barRegistrationNumber: z.string().optional(),
    barCouncilName: z.string().optional(),
    yearsOfExperience: z.number().int().min(0).optional(),
    primaryPracticeArea: z.string().optional(),
    courtName: z.string().optional(),
    designation: z.string().optional(),
  }),
});

export const AuthValidation = {
  syncUserValidation,
  onboardValidation,
  updateProfileValidation,
};
