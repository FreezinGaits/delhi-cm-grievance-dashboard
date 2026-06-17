import { Router, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { authorize, ALL_ROLES } from '../middleware/rbac.middleware';
import { Department } from '../models/Department';
import { Complaint } from '../models/Complaint';
import { User } from '../models/User';

const router = Router();

router.get('/', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const departments = await Department.find({ isActive: true }).populate('headOfficer', 'name').select('-routingRules -externalApi').lean();
    res.json({ success: true, data: departments });
  } catch (error) { next(error); }
});

router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const dept = await Department.findById(req.params.id).populate('headOfficer', 'name email phone');
    if (!dept) return res.status(404).json({ success: false, error: { message: 'Department not found' } });
    const [complaintCount, officerCount] = await Promise.all([
      Complaint.countDocuments({ assignedDepartment: dept._id, isDeleted: false }),
      User.countDocuments({ departmentId: dept._id, isActive: true }),
    ]);
    res.json({ success: true, data: { department: dept, stats: { complaintCount, officerCount } } });
  } catch (error) { next(error); }
});

router.get('/:id/officers', authenticate, authorize(...ALL_ROLES), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const officers = await User.find({ departmentId: req.params.id, isActive: true, role: { $in: ['officer', 'department_head'] } }).lean();
    res.json({ success: true, data: officers });
  } catch (error) { next(error); }
});

export default router;
