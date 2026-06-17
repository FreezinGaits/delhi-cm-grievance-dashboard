import { Router, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { authorize, MANAGEMENT_ACCESS } from '../middleware/rbac.middleware';
import { Complaint } from '../models/Complaint';
import { Department } from '../models/Department';

const router = Router();

router.get('/overview', authenticate, authorize(...MANAGEMENT_ACCESS), async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const [total, statusAgg, priorityAgg, sourceAgg, monthlyTrend] = await Promise.all([
      Complaint.countDocuments({ isDeleted: false }),
      Complaint.aggregate([{ $match: { isDeleted: false } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Complaint.aggregate([{ $match: { isDeleted: false } }, { $group: { _id: '$priority', count: { $sum: 1 } } }]),
      Complaint.aggregate([{ $match: { isDeleted: false } }, { $group: { _id: '$source', count: { $sum: 1 } } }]),
      Complaint.aggregate([
        { $match: { isDeleted: false, createdAt: { $gte: new Date(Date.now() - 30 * 86400000) } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);
    res.json({ success: true, data: { total, byStatus: statusAgg, byPriority: priorityAgg, bySource: sourceAgg, monthlyTrend } });
  } catch (error) { next(error); }
});

router.get('/sla-report', authenticate, authorize(...MANAGEMENT_ACCESS), async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const slaData = await Complaint.aggregate([
      { $match: { isDeleted: false, assignedDepartment: { $exists: true } } },
      { $group: { _id: '$assignedDepartment', total: { $sum: 1 }, breached: { $sum: { $cond: ['$sla.breached', 1, 0] } } } },
    ]);
    const deptIds = slaData.map((s) => s._id);
    const depts = await Department.find({ _id: { $in: deptIds } }).select('name code').lean();
    const deptMap = new Map(depts.map((d) => [d._id.toString(), d]));
    const result = slaData.map((s) => ({
      department: deptMap.get(s._id.toString()), total: s.total, breached: s.breached,
      complianceRate: s.total > 0 ? Math.round(((s.total - s.breached) / s.total) * 100) : 100,
    }));
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
});

router.get('/resolution-rates', authenticate, authorize(...MANAGEMENT_ACCESS), async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await Complaint.aggregate([
      { $match: { isDeleted: false, createdAt: { $gte: new Date(Date.now() - 30 * 86400000) } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        total: { $sum: 1 },
        resolved: { $sum: { $cond: [{ $in: ['$status', ['resolved', 'closed']] }, 1, 0] } },
      }},
      { $sort: { _id: 1 } },
    ]);
    res.json({ success: true, data });
  } catch (error) { next(error); }
});

router.get('/hotspots', authenticate, authorize(...MANAGEMENT_ACCESS), async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const hotspots = await Complaint.aggregate([
      { $match: { isDeleted: false, status: { $nin: ['resolved', 'closed'] } } },
      { $group: { _id: { ward: '$address.ward', category: '$category' }, count: { $sum: 1 }, critical: { $sum: { $cond: ['$isCritical', 1, 0] } } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);
    res.json({ success: true, data: hotspots });
  } catch (error) { next(error); }
});

export default router;
