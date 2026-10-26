import { z } from 'zod';

const passwordSchema = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password cannot exceed 100 characters');

export const SignupSchema = z
  .object({
    email: z.string({ required_error: 'Email is required' }).email('Email must be valid').max(191),
    username: z
      .string({ required_error: 'Username is required' })
      .trim()
      .min(3, 'Username must be at least 3 characters')
      .max(50, 'Username cannot exceed 50 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscore'),
    password: passwordSchema,
    confirmPassword: z.string({ required_error: 'Confirm password is required' }),
  })
  .superRefine((value, ctx) => {
    if (value.password !== value.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'Passwords do not match',
      });
    }
  });

export const VerifySignupSchema = z.object({
  email: z.string({ required_error: 'Email is required' }).email('Email must be valid').max(191),
  code: z.string({ required_error: 'Verification code is required' }).regex(/^\d{6}$/, 'Code must be 6 digits'),
});

export const LoginSchema = z.object({
  username: z.string({ required_error: 'Username is required' }).trim().min(1, 'Username is required'),
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
});

export const ForgotPasswordSchema = z.object({
  email: z.string({ required_error: 'Email is required' }).email('Email must be valid').max(191),
});

export const ResetPasswordSchema = z
  .object({
    email: z.string({ required_error: 'Email is required' }).email('Email must be valid').max(191),
    code: z.string({ required_error: 'Verification code is required' }).regex(/^\d{6}$/, 'Code must be 6 digits'),
    newPassword: passwordSchema,
    confirmPassword: z.string({ required_error: 'Confirm password is required' }),
  })
  .superRefine((value, ctx) => {
    if (value.newPassword !== value.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'Passwords do not match',
      });
    }
  });

export type SignupInput = z.infer<typeof SignupSchema>;
export type VerifySignupInput = z.infer<typeof VerifySignupSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
