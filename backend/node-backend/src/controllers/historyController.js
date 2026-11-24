import {
  getVerifications,
  getVerificationById as fetchVerificationById,
  deleteVerificationById as removeVerificationById
} from '../services/historyService.js';
import { getDatabaseStatus } from '../config/database.js';



/**
 * Lists paginated verification history.
 * Supports filtering by verdict and input_type, plus pagination.
 */
export const listHistory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 10);
    const { verdict, input_type } = req.query;

    const result = await getVerifications({ page, limit, verdict, input_type });

    return res.status(200).json({
      success: true,
      database_status: getDatabaseStatus(),
      pagination: result.pagination,
      data: result.records
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Retrieves a single verification record by ID.
 */
export const getHistoryItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await fetchVerificationById(id);

    if (!item) {
      return res.status(404).json({
        success: false,
        error: {
          message: `Verification record with ID '${id}' was not found.`,
          code: 'RECORD_NOT_FOUND',
          details: null
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: item
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Deletes a verification record by ID.
 */
export const deleteHistoryItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await removeVerificationById(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: {
          message: `Verification record with ID '${id}' was not found or could not be deleted.`,
          code: 'RECORD_NOT_FOUND',
          details: null
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: `Verification record '${id}' was successfully deleted.`
    });
  } catch (err) {
    next(err);
  }
};
