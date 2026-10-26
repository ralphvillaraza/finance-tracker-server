import { z } from 'zod';

export const TransactionTypeEnum = z.enum(['income', 'expense']);

/**
 * Schema for creating a new transaction
 */
export const CreateTransactionSchema = z.object({
  type: TransactionTypeEnum,
  amount: z
    .number({
      required_error: 'Amount is required',
      invalid_type_error: 'Amount must be a number',
    })
    .positive('Amount must be greater than zero')
    .max(99999999.99, 'Amount exceeds maximum allowed limit'),
  category: z
    .string({ required_error: 'Category is required' })
    .trim()
    .min(1, 'Category cannot be empty')
    .max(50, 'Category cannot exceed 50 characters'),
  description: z
    .string({ required_error: 'Description is required' })
    .trim()
    .min(1, 'Description cannot be empty')
    .max(255, 'Description cannot exceed 255 characters'),
  date: z
    .string({ required_error: 'Date is required' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  user_id: z.number().int().positive().optional().default(1),
});

/**
 * Schema for updating an existing transaction
 */
export const UpdateTransactionSchema = CreateTransactionSchema.partial();

/**
 * Schema for route ID parameter
 */
export const TransactionIdParamSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, 'ID must be a positive integer')
    .transform((val) => parseInt(val, 10)),
});

/**
 * Schema for querying transactions list
 */
export const QueryTransactionsSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  type: TransactionTypeEnum.optional(),
  category: z.string().trim().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  search: z.string().trim().optional(),
});

export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof UpdateTransactionSchema>;
export type QueryTransactionsInput = z.infer<typeof QueryTransactionsSchema>;

