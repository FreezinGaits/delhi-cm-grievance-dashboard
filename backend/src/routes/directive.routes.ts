import { Router, Response, NextFunction } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth.middleware';
import { authorize, CM_ACCESS, ALL_STAFF } from '../middleware/rbac.middleware';
import { DirectiveService } from '../services/directive.service';
import { DirectivePriority, DirectiveStatus } from '../models/Directive';
import { ApiError } from '../middleware/error.middleware';

const router = Router();

/**
 * POST /api/v1/directives
 * Issue a new CM spot directive on a complaint.
 * Access: CM only.
 */
router.post('/', authenticate, authorize(...CM_ACCESS), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) throw ApiError.unauthorized();
    const { complaintId, directive, priority } = req.body;

    if (!complaintId || !directive) {
      throw ApiError.badRequest('complaintId and directive text are required');
    }

    const validPriority = Object.values(DirectivePriority).includes(priority)
      ? priority
      : DirectivePriority.IMMEDIATE;

    const result = await DirectiveService.issueDirective(
      complaintId,
      directive,
      validPriority,
      req.user.id,
    );
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/directives
 * List all directives with optional filters.
 * Access: CM and management.
 */
router.get('/', authenticate, authorize(...CM_ACCESS), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, complaintId, officerId, page, limit } = req.query;
    const result = await DirectiveService.listDirectives({
      status: status as DirectiveStatus | undefined,
      complaintId: complaintId as string | undefined,
      officerId: officerId as string | undefined,
      page: page ? parseInt(String(page), 10) : undefined,
      limit: limit ? parseInt(String(limit), 10) : undefined,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/directives/stats
 * Directive dashboard summary stats.
 */
router.get('/stats', authenticate, authorize(...CM_ACCESS), async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const stats = await DirectiveService.getDashboardStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/directives/mine
 * Get directives assigned to the authenticated officer.
 * Access: Officers.
 */
router.get('/mine', authenticate, authorize(...ALL_STAFF), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) throw ApiError.unauthorized();
    const directives = await DirectiveService.getOfficerDirectives(req.user.id);
    res.json({ success: true, data: directives });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/v1/directives/:id/acknowledge
 * Acknowledge a directive.
 * Access: Officers and department heads.
 */
router.patch('/:id/acknowledge', authenticate, authorize(...ALL_STAFF), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) throw ApiError.unauthorized();
    const result = await DirectiveService.acknowledgeDirective(String(req.params.id), req.user.id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/v1/directives/:id/start
 * Move directive to in-progress.
 */
router.patch('/:id/start', authenticate, authorize(...ALL_STAFF), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) throw ApiError.unauthorized();
    const result = await DirectiveService.startDirective(String(req.params.id), req.user.id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/v1/directives/:id/complete
 * Complete a directive with notes and optional evidence.
 */
router.patch('/:id/complete', authenticate, authorize(...ALL_STAFF), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) throw ApiError.unauthorized();
    const { completionNotes, evidence } = req.body;
    if (!completionNotes) throw ApiError.badRequest('completionNotes is required');

    const result = await DirectiveService.completeDirective(
      String(req.params.id),
      req.user.id,
      completionNotes,
      evidence,
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

export default router;
