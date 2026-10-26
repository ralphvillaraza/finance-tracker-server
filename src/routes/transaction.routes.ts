import { Router } from 'express';
import {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from '../controllers/transaction.controller.js';
import { validate } from '../middleware/validate.js';
import {
  CreateTransactionSchema,
  UpdateTransactionSchema,
  TransactionIdParamSchema,
  QueryTransactionsSchema,
} from '../schemas/transaction.schema.js';

const router = Router();

// GET /api/transactions - retrieve with query filters
router.get('/', validate(QueryTransactionsSchema, 'query'), getTransactions);

// GET /api/transactions/:id - retrieve single record
router.get('/:id', validate(TransactionIdParamSchema, 'params'), getTransactionById);

// POST /api/transactions - create new transaction
router.post('/', validate(CreateTransactionSchema, 'body'), createTransaction);

// PUT /api/transactions/:id - update existing record
router.put(
  '/:id',
  validate(TransactionIdParamSchema, 'params'),
  validate(UpdateTransactionSchema, 'body'),
  updateTransaction
);

// DELETE /api/transactions/:id - delete record
router.delete('/:id', validate(TransactionIdParamSchema, 'params'), deleteTransaction);

export default router;

