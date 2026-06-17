import { Router, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { authorize, ADMIN_ACCESS, MANAGEMENT_ACCESS } from '../middleware/rbac.middleware';
import { User, UserRole } from '../models/User';
import { Department } from '../models/Department';
import { AuditLog } from '../models/AuditLog';
import { ApiError } from '../middleware/error.middleware';
import bcrypt from 'bcryptjs';

const router = Router();

router.get('/users', authenticate, authorize(...MANAGEMENT_ACCESS), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { role, department, page = '1', limit = '20' } = req.query as Record<string, string>;
    const filter: Record<string, unknown> = {};
    if (role) filter.role = role;
    if (department) filter.departmentId = department;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      User.find(filter).populate('departmentId', 'name code').skip(skip).limit(parseInt(limit)).lean(),
      User.countDocuments(filter),
    ]);
    res.json({ success: true, data: users, meta: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (error) { next(error); }
});

router.post('/users', authenticate, authorize(...ADMIN_ACCESS), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { firstName, lastName, email, phone, role, departmentId, ward, password } = req.body;
    if (!firstName || !lastName || !email || !phone || !role || !password) throw ApiError.badRequest('All fields required');
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name: { first: firstName, last: lastName }, email, phone, role, departmentId, ward, passwordHash,
      isActive: true, isEmailVerified: true, isPhoneVerified: true,
      preferences: { language: 'en', notificationChannels: ['email'] },
    });
    res.status(201).json({ success: true, data: { user } });
  } catch (error) { next(error); }
});

router.patch('/users/:id', authenticate, authorize(...ADMIN_ACCESS), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const updates = req.body;
    delete updates.passwordHash; delete updates.refreshTokens;
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!user) throw ApiError.notFound('User not found');
    res.json({ success: true, data: { user } });
  } catch (error) { next(error); }
});

router.delete('/users/:id', authenticate, authorize(...ADMIN_ACCESS), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isDeleted: true, deletedAt: new Date() }, { new: true });
    if (!user) throw ApiError.notFound('User not found');
    res.json({ success: true, data: { message: 'User deactivated' } });
  } catch (error) { next(error); }
});

router.get('/departments', authenticate, authorize(...MANAGEMENT_ACCESS), async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const departments = await Department.find({ isActive: true }).populate('headOfficer', 'name email').lean();
    res.json({ success: true, data: departments });
  } catch (error) { next(error); }
});

router.get('/audit-logs', authenticate, authorize(...ADMIN_ACCESS), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '50', action, entity } = req.query as Record<string, string>;
    const filter: Record<string, unknown> = {};
    if (action) filter.action = action;
    if (entity) filter.entity = entity;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [logs, total] = await Promise.all([
      AuditLog.find(filter).populate('userId', 'name email role').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      AuditLog.countDocuments(filter),
    ]);
    res.json({ success: true, data: logs, meta: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (error) { next(error); }
});

export default router;
