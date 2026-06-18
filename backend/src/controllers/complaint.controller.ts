import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ComplaintService } from '../services/complaint.service';
import { ApiError } from '../middleware/error.middleware';
import { ComplaintStatus } from '../models/Complaint';

export class ComplaintController {
  /**
   * POST /complaints — submit a new complaint
   */
  static async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) throw ApiError.unauthorized();

      const { title, description, category, subcategory, latitude, longitude, address, source } = req.body;

      if (!title || !description || !category || latitude === undefined || longitude === undefined) {
        throw ApiError.badRequest('Required: title, description, category, latitude, longitude');
      }

      // Handle file uploads (media[] from multer)
      const media = (req.files as Express.Multer.File[] || []).map((file) => ({
        type: file.mimetype.startsWith('image/') ? 'image' as const :
              file.mimetype.startsWith('video/') ? 'video' as const :
              file.mimetype.startsWith('audio/') ? 'audio' as const : 'document' as const,
        url: `/uploads/${file.filename}`,
        mimeType: file.mimetype,
        size: file.size,
      }));

      const complaint = await ComplaintService.createComplaint({
        citizenId: req.user.id,
        title,
        description,
        category,
        subcategory,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        address: address ? (typeof address === 'string' ? JSON.parse(address) : address) : undefined,
        media,
        source,
      });

      res.status(201).json({
        success: true,
        data: {
          complaint: {
            id: complaint._id,
            referenceNumber: complaint.referenceNumber,
            status: complaint.status,
            priority: complaint.priority,
            isCritical: complaint.isCritical,
            createdAt: complaint.createdAt,
          },
          message: `Complaint registered successfully. Track with reference: ${complaint.referenceNumber}`,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /complaints — list complaints with filters
   */
  static async list(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized();

      const query: Record<string, unknown> = { ...req.query };

      // Role-based filtering
      if (req.user.role === 'citizen') {
        query.citizenId = req.user.id;
      } else if (req.user.role === 'officer') {
        query.officerId = req.user.id;
      }

      const result = await ComplaintService.listComplaints(query as any);

      res.json({ success: true, data: result.complaints, meta: result.meta });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /complaints/:id — get complaint details
   */
  static async getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const complaint = await ComplaintService.getComplaintById(req.params.id as string);
      res.json({ success: true, data: { complaint } });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /complaints/track/:referenceNumber — public tracking
   */
  static async track(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ComplaintService.trackComplaint(req.params.referenceNumber as string);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /complaints/:id/status — update complaint status
   */
  static async updateStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) throw ApiError.unauthorized();

      const { status, notes } = req.body;
      if (!status) throw ApiError.badRequest('Status is required');

      if (!Object.values(ComplaintStatus).includes(status)) {
        throw ApiError.badRequest(`Invalid status. Must be one of: ${Object.values(ComplaintStatus).join(', ')}`);
      }

      const complaint = await ComplaintService.updateStatus(req.params.id as string, status, req.user.id, notes);

      res.json({ success: true, data: { complaint } });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /complaints/:id/history — get complaint timeline
   */
  static async getHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const history = await ComplaintService.getComplaintHistory(req.params.id as string);
      res.json({ success: true, data: { history } });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /complaints/:id/confirm — citizen confirms resolution
   */
  static async confirmResolution(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) throw ApiError.unauthorized();
      const { rating, comment } = req.body;

      const { Complaint } = await import('../models/Complaint');
      const { ComplaintHistory, HistoryAction } = await import('../models/ComplaintHistory');

      const complaint = await Complaint.findById(req.params.id);
      if (!complaint) throw ApiError.notFound('Complaint not found');

      if (complaint.citizenId.toString() !== req.user.id) {
        throw ApiError.forbidden('Only the complaint owner can confirm resolution');
      }

      complaint.status = ComplaintStatus.RESOLVED;
      complaint.citizenFeedback = {
        isConfirmed: true,
        respondedAt: new Date(),
        rating: rating || undefined,
      };
      await complaint.save();

      await ComplaintHistory.create({
        complaintId: complaint._id,
        action: HistoryAction.CITIZEN_CONFIRMED,
        fromStatus: ComplaintStatus.PROVISIONALLY_RESOLVED,
        toStatus: ComplaintStatus.RESOLVED,
        performedBy: req.user.id,
        notes: comment || 'Citizen confirmed resolution',
      });

      res.json({ success: true, data: { message: 'Resolution confirmed. Thank you!' } });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /complaints/:id/reject — citizen rejects resolution
   */
  static async rejectResolution(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) throw ApiError.unauthorized();
      const { reason } = req.body;

      const { Complaint } = await import('../models/Complaint');
      const { ComplaintHistory, HistoryAction } = await import('../models/ComplaintHistory');

      const complaint = await Complaint.findById(req.params.id);
      if (!complaint) throw ApiError.notFound('Complaint not found');

      if (complaint.citizenId.toString() !== req.user.id) {
        throw ApiError.forbidden('Only the complaint owner can reject resolution');
      }

      complaint.status = ComplaintStatus.REJECTED;
      complaint.escalationLevel = (complaint.escalationLevel || 0) + 1;
      complaint.citizenFeedback = {
        isConfirmed: false,
        respondedAt: new Date(),
        rejectionReason: reason,
      };
      await complaint.save();

      await ComplaintHistory.create({
        complaintId: complaint._id,
        action: HistoryAction.CITIZEN_REJECTED,
        fromStatus: ComplaintStatus.PROVISIONALLY_RESOLVED,
        toStatus: ComplaintStatus.REJECTED,
        performedBy: req.user.id,
        notes: reason || 'Citizen rejected resolution',
      });

      res.json({ success: true, data: { message: 'Resolution rejected. Complaint has been escalated.' } });
    } catch (error) {
      next(error);
    }
  }
}
