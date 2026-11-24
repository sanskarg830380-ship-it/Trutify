import express from 'express';
import {
  listHistory,
  getHistoryItem,
  deleteHistoryItem
} from '../controllers/historyController.js';

const router = express.Router();

/**
 * Verification History Endpoints
 * GET    /api/history      - List past verifications (with pagination and filters)
 * GET    /api/history/:id  - Get a single verification by ID
 * DELETE /api/history/:id  - Delete a verification by ID
 */
router.get('/', listHistory);
router.get('/:id', getHistoryItem);
router.delete('/:id', deleteHistoryItem);

export default router;
