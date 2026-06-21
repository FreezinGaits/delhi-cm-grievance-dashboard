import { Router, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
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

// DEPRECATED: Use POST /api/v1/directives instead (directive.routes.ts)
router.post('/spot-directive', authenticate, authorize(...CM_ACCESS), async (_req: AuthRequest, res: Response) => {
  res.status(301).json({
    success: false,
    error: { message: 'This endpoint is deprecated. Use POST /api/v1/directives instead.' },
  });
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

router.post('/officers/:id/warning', authenticate, authorize(...CM_ACCESS), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { reason } = req.body;
    if (!reason) throw ApiError.badRequest('Reason is required');
    const { User } = await import('../models/User');
    const officer = await User.findById(req.params.id);
    if (!officer || officer.role !== 'officer') throw ApiError.notFound('Officer not found');
    
    if (!officer.warnings) {
      officer.warnings = [];
    }
    officer.warnings.push({
      reason,
      issuedBy: new mongoose.Types.ObjectId(req.user!.id),
      issuedAt: new Date()
    });
    
    await officer.save();
    res.json({ success: true, message: 'Disciplinary warning issued successfully', officer });
  } catch (error) { next(error); }
});

router.post('/officers/:id/suspend', authenticate, authorize(...CM_ACCESS), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { suspend, reason } = req.body;
    if (suspend && !reason) throw ApiError.badRequest('Reason is required for suspension');
    
    const { User } = await import('../models/User');
    const officer = await User.findById(req.params.id);
    if (!officer || officer.role !== 'officer') throw ApiError.notFound('Officer not found');
    
    officer.isSuspended = !!suspend;
    officer.isActive = !suspend;
    if (suspend) {
      officer.suspensionReason = reason;
      officer.suspendedAt = new Date();
      officer.suspendedBy = new mongoose.Types.ObjectId(req.user!.id);
    } else {
      officer.suspensionReason = undefined;
      officer.suspendedAt = undefined;
      officer.suspendedBy = undefined;
    }
    
    await officer.save();
    res.json({ 
      success: true, 
      message: suspend ? 'Officer suspended successfully' : 'Officer unsuspended successfully', 
      officer 
    });
  } catch (error) { next(error); }
});

export default router;
