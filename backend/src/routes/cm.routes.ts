import { Router, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { authorize, CM_ACCESS, MANAGEMENT_ACCESS } from '../middleware/rbac.middleware';
import { CMService } from '../services/cm.service';
import { ApiError } from '../middleware/error.middleware';

const router = Router();

router.get('/dashboard', authenticate, authorize(...MANAGEMENT_ACCESS), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await CMService.getDashboardSummary();
    res.json({ success: true, data });
  } catch (error) { next(error); }
});

router.get('/heatmap', authenticate, authorize(...MANAGEMENT_ACCESS), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { category, status, dateFrom, dateTo } = req.query as Record<string, string>;
    const data = await CMService.getHeatmapData({ category, status, dateFrom, dateTo });
    res.json({ success: true, data });
  } catch (error) { next(error); }
});

router.get('/nearby-complaints', authenticate, authorize(...CM_ACCESS), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const radius = parseInt(req.query.radius as string) || 1000;
    if (isNaN(lat) || isNaN(lng)) throw ApiError.badRequest('lat and lng are required');
    const data = await CMService.getNearbyComplaints(lat, lng, radius);
    res.json({ success: true, data });
  } catch (error) { next(error); }
});

router.get('/officer-ledger', authenticate, authorize(...MANAGEMENT_ACCESS), async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await CMService.getOfficerLedger();
    res.json({ success: true, data });
  } catch (error) { next(error); }
});

router.post('/spot-directive', authenticate, authorize(...CM_ACCESS), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) throw ApiError.unauthorized();
    const { complaintId, directive, priority } = req.body;
    if (!complaintId || !directive) throw ApiError.badRequest('complaintId and directive are required');
    const data = await CMService.issueSpotDirective(complaintId, directive, priority || 'immediate', req.user.id);
    res.json({ success: true, data });
  } catch (error) { next(error); }
});

router.get('/alerts', authenticate, authorize(...MANAGEMENT_ACCESS), async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { Complaint } = await import('../models/Complaint');
    const alerts = await Complaint.find({
      isCritical: true,
      status: { $nin: ['resolved', 'closed'] },
      isDeleted: false,
    }).populate('assignedDepartment', 'name code').populate('assignedOfficer', 'name').sort({ createdAt: -1 }).limit(20).lean();
    res.json({ success: true, data: alerts });
  } catch (error) { next(error); }
});

export default router;
