import { Router, Response, NextFunction } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth.middleware';
import { authorize, CM_ACCESS, MANAGEMENT_ACCESS } from '../middleware/rbac.middleware';
import { AccountabilityService } from '../services/accountability.service';
import { ClusteringService } from '../services/clustering.service';
import { ApiError } from '../middleware/error.middleware';

const router = Router();

// ══════════════════════════════════════════════════════════════
// ACCOUNTABILITY ENGINE ENDPOINTS
// ══════════════════════════════════════════════════════════════

/**
 * GET /api/v1/governance/officer-rankings
 * Get officer performance rankings.
 * Access: CM and management.
 */
router.get('/officer-rankings', authenticate, authorize(...MANAGEMENT_ACCESS), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const periodType = String(req.query.period || 'weekly');
    const departmentId = req.query.departmentId ? String(req.query.departmentId) : undefined;
    const sortBy = (String(req.query.sortBy || 'top')) as 'top' | 'bottom';
    const limit = parseInt(String(req.query.limit || '20'), 10);

    const rankings = await AccountabilityService.getOfficerRankings(
      periodType as 'weekly' | 'monthly' | 'quarterly',
      { departmentId, limit, sortBy },
    );

    res.json({ success: true, data: rankings });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/governance/officer-score/:officerId
 * Get performance history for a specific officer.
 */
router.get('/officer-score/:officerId', authenticate, authorize(...MANAGEMENT_ACCESS), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const history = await AccountabilityService.getOfficerHistory(
      String(req.params.officerId),
      req.query.period ? String(req.query.period) : undefined,
    );
    res.json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/governance/compute-scores
 * Trigger score computation (admin/CM only).
 */
router.post('/compute-scores', authenticate, authorize(...CM_ACCESS), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const period = String(req.body.period || 'weekly');
    const result = await AccountabilityService.computeAllScores(
      period as 'weekly' | 'monthly' | 'quarterly',
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// ══════════════════════════════════════════════════════════════
// CLUSTERING ENGINE ENDPOINTS
// ══════════════════════════════════════════════════════════════

/**
 * GET /api/v1/governance/clusters
 * List active incident clusters.
 */
router.get('/clusters', authenticate, authorize(...MANAGEMENT_ACCESS), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(String(req.query.page || '1'), 10);
    const limit = parseInt(String(req.query.limit || '20'), 10);
    const result = await ClusteringService.listActiveClusters(page, limit);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/governance/clusters/:id
 * Get cluster details with all linked complaints.
 */
router.get('/clusters/:id', authenticate, authorize(...MANAGEMENT_ACCESS), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await ClusteringService.getClusterDetails(String(req.params.id));
    if (!result) throw ApiError.notFound('Cluster not found');
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/governance/run-clustering
 * Manually trigger clustering (admin/CM only).
 */
router.post('/run-clustering', authenticate, authorize(...CM_ACCESS), async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await ClusteringService.runClustering();
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

export default router;
