import { Router } from 'express';
import {
  getSummary,
  getCashFlow,
  getCategoryBreakdown,
} from '../controllers/analytics.controller.js';

const router = Router();

// GET /api/summary - Dashboard KPI metrics
router.get('/summary', getSummary);

// GET /api/analytics/cash-flow - 6-month trend for line/area chart
router.get('/cash-flow', getCashFlow);

// GET /api/analytics/category-breakdown - Expense distribution for donut chart
router.get('/category-breakdown', getCategoryBreakdown);

export default router;

