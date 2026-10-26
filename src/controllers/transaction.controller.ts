import { Request, Response, NextFunction } from 'express';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { pool } from '../config/db.js';
import { CreateTransactionInput, UpdateTransactionInput, QueryTransactionsInput } from '../schemas/transaction.schema.js';
import { resolveActiveUserId } from '../utils/userContext.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

interface TransactionRow extends RowDataPacket {
  id: number;
  user_id: number;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: string;
  created_at: string;
  updated_at: string;
}

/**
 * GET /api/transactions
 * Retrieves transactions ordered by date descending with optional pagination and filters.
 */
export async function getTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = req.query as unknown as QueryTransactionsInput;
    const userId = await resolveActiveUserId({ reqUserId: (req as AuthenticatedRequest).userId });
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const offset = (page - 1) * limit;

    const whereClauses: string[] = ['user_id = ?'];
    const queryParams: (string | number)[] = [userId];

    if (query.type) {
      whereClauses.push('type = ?');
      queryParams.push(query.type);
    }

    if (query.category) {
      whereClauses.push('category = ?');
      queryParams.push(query.category);
    }

    if (query.startDate) {
      whereClauses.push('date >= ?');
      queryParams.push(query.startDate);
    }

    if (query.endDate) {
      whereClauses.push('date <= ?');
      queryParams.push(query.endDate);
    }

    if (query.search) {
      whereClauses.push('(description LIKE ? OR category LIKE ?)');
      queryParams.push(`%${query.search}%`, `%${query.search}%`);
    }

    const whereSql = whereClauses.join(' AND ');

    // Count total matches
    const countSql = `SELECT COUNT(*) as total FROM transactions WHERE ${whereSql}`;
    const [countRows] = await pool.query<RowDataPacket[]>(countSql, queryParams);
    const total = countRows[0]?.total || 0;

    // Fetch paginated data
    const selectSql = `
      SELECT 
        id, 
        user_id, 
        type, 
        CAST(amount AS DOUBLE) as amount, 
        category, 
        description, 
        DATE_FORMAT(date, '%Y-%m-%d') as date, 
        created_at, 
        updated_at
      FROM transactions
      WHERE ${whereSql}
      ORDER BY date DESC, id DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.query<TransactionRow[]>(selectSql, [...queryParams, limit, offset]);

    res.json({
      success: true,
      data: rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/transactions/:id
 * Retrieves a single transaction record by ID.
 */
export async function getTransactionById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const userId = await resolveActiveUserId({ reqUserId: (req as AuthenticatedRequest).userId });

    const sql = `
      SELECT 
        id, 
        user_id, 
        type, 
        CAST(amount AS DOUBLE) as amount, 
        category, 
        description, 
        DATE_FORMAT(date, '%Y-%m-%d') as date, 
        created_at, 
        updated_at
      FROM transactions 
      WHERE id = ? AND user_id = ?
    `;

    const [rows] = await pool.query<TransactionRow[]>(sql, [id, userId]);

    if (!rows || rows.length === 0) {
      res.status(404).json({ success: false, error: 'Transaction not found' });
      return;
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/transactions
 * Creates a new transaction with parameterized queries.
 */
export async function createTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input: CreateTransactionInput = req.body;
    const userId = await resolveActiveUserId({
      reqUserId: (req as AuthenticatedRequest).userId,
      preferredUserId: input.user_id,
      ensureExists: true,
    });

    const sql = `
      INSERT INTO transactions (user_id, type, amount, category, description, date)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.query<ResultSetHeader>(sql, [
      userId,
      input.type,
      input.amount,
      input.category,
      input.description,
      input.date,
    ]);

    res.status(201).json({
      success: true,
      message: 'Transaction recorded successfully',
      data: {
        id: result.insertId,
        user_id: userId,
        type: input.type,
        amount: input.amount,
        category: input.category,
        description: input.description,
        date: input.date,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/transactions/:id
 * Updates an existing transaction securely.
 */
export async function updateTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const userId = await resolveActiveUserId({ reqUserId: (req as AuthenticatedRequest).userId });
    const updates: UpdateTransactionInput = req.body;

    const fields: string[] = [];
    const values: (string | number)[] = [];

    if (updates.type !== undefined) {
      fields.push('type = ?');
      values.push(updates.type);
    }
    if (updates.amount !== undefined) {
      fields.push('amount = ?');
      values.push(updates.amount);
    }
    if (updates.category !== undefined) {
      fields.push('category = ?');
      values.push(updates.category);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.date !== undefined) {
      fields.push('date = ?');
      values.push(updates.date);
    }

    if (fields.length === 0) {
      res.status(400).json({ success: false, error: 'No fields provided for update' });
      return;
    }

    values.push(id, userId);

    const sql = `
      UPDATE transactions
      SET ${fields.join(', ')}
      WHERE id = ? AND user_id = ?
    `;

    const [result] = await pool.query<ResultSetHeader>(sql, values);

    if (result.affectedRows === 0) {
      res.status(404).json({ success: false, error: 'Transaction not found or unauthorized' });
      return;
    }

    res.json({
      success: true,
      message: 'Transaction updated successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/transactions/:id
 * Deletes a transaction record securely.
 */
export async function deleteTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const userId = await resolveActiveUserId({ reqUserId: (req as AuthenticatedRequest).userId });

    const sql = 'DELETE FROM transactions WHERE id = ? AND user_id = ?';
    const [result] = await pool.query<ResultSetHeader>(sql, [id, userId]);

    if (result.affectedRows === 0) {
      res.status(404).json({ success: false, error: 'Transaction not found or unauthorized' });
      return;
    }

    res.json({
      success: true,
      message: 'Transaction deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

