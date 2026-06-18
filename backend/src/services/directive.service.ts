import mongoose from 'mongoose';
import { Directive, DirectiveStatus, DirectivePriority, IDirective } from '../models/Directive';
import { Complaint, ComplaintPriority } from '../models/Complaint';
import { ComplaintHistory, HistoryAction } from '../models/ComplaintHistory';
import { AuditLog } from '../models/AuditLog';
import { ApiError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';

/**
 * CM Spot Directives Service.
 *
 * Allows the Chief Minister to issue directives during field visits.
 * Directives elevate complaint priority, notify officers, and track
 * a full lifecycle (Created → Acknowledged → In Progress → Completed).
 */

const PRIORITY_DEADLINES: Record<DirectivePriority, number> = {
  [DirectivePriority.IMMEDIATE]: 4,       // 4 hours
  [DirectivePriority.WITHIN_24H]: 24,     // 24 hours
  [DirectivePriority.WITHIN_WEEK]: 168,   // 7 days
};

export class DirectiveService {
  /**
   * Issue a new CM spot directive on a complaint.
   */
  static async issueDirective(
    complaintId: string,
    directiveText: string,
    priority: DirectivePriority,
    issuedById: string,
  ): Promise<IDirective> {
    const complaint = await Complaint.findById(complaintId)
      .populate('assignedOfficer', 'name')
      .populate('assignedDepartment', 'name');

    if (!complaint) {
      throw ApiError.notFound('Complaint not found');
    }

    // Calculate deadline
    const deadlineHours = PRIORITY_DEADLINES[priority] || 4;
    const deadline = new Date(Date.now() + deadlineHours * 3600000);

    // Create directive
    const directive = await Directive.create({
      complaintId: complaint._id,
      directive: directiveText,
      issuedBy: issuedById,
      assignedOfficer: complaint.assignedOfficer,
      assignedDepartment: complaint.assignedDepartment,
      priority,
      status: DirectiveStatus.CREATED,
      deadline,
      statusHistory: [
        {
          status: DirectiveStatus.CREATED,
          changedBy: new mongoose.Types.ObjectId(issuedById),
          changedAt: new Date(),
          notes: `Directive issued by CM: ${directiveText}`,
        },
      ],
    });

    // Elevate complaint priority
    const oldPriority = complaint.priority;
    complaint.priority = ComplaintPriority.CRITICAL;
    complaint.spotDirective = {
      directive: directiveText,
      issuedBy: new mongoose.Types.ObjectId(issuedById),
      issuedAt: new Date(),
      priority,
    };
    await complaint.save();

    // Create complaint history entry
    await ComplaintHistory.create({
      complaintId: complaint._id,
      action: HistoryAction.DIRECTIVE_ISSUED,
      performedBy: issuedById,
      notes: `CM Directive: "${directiveText}" | Priority: ${priority} | Deadline: ${deadline.toISOString()}`,
      metadata: {
        directiveId: directive._id,
        previousPriority: oldPriority,
        newPriority: ComplaintPriority.CRITICAL,
      },
    });

    // Audit log
    await AuditLog.create({
      action: 'CM_DIRECTIVE_ISSUED',
      entity: 'Directive',
      entityId: directive._id,
      userId: issuedById,
      changes: {
        after: {
          complaintId,
          directive: directiveText,
          priority,
          deadline: deadline.toISOString(),
        },
      },
    });

    logger.info(
      `[Directive] CM issued directive on ${complaint.referenceNumber}: "${directiveText}" (${priority})`,
    );

    return directive;
  }

  /**
   * Acknowledge a directive (by officer or department head).
   */
  static async acknowledgeDirective(
    directiveId: string,
    acknowledgedById: string,
  ): Promise<IDirective> {
    const directive = await Directive.findById(directiveId);
    if (!directive) throw ApiError.notFound('Directive not found');

    if (directive.status !== DirectiveStatus.CREATED) {
      throw ApiError.badRequest(`Cannot acknowledge directive in ${directive.status} state`);
    }

    directive.status = DirectiveStatus.ACKNOWLEDGED;
    directive.acknowledgedAt = new Date();
    directive.acknowledgedBy = new mongoose.Types.ObjectId(acknowledgedById);
    directive.statusHistory.push({
      status: DirectiveStatus.ACKNOWLEDGED,
      changedBy: new mongoose.Types.ObjectId(acknowledgedById),
      changedAt: new Date(),
      notes: 'Directive acknowledged',
    });
    await directive.save();

    await AuditLog.create({
      action: 'DIRECTIVE_ACKNOWLEDGED',
      entity: 'Directive',
      entityId: directive._id,
      userId: acknowledgedById,
    });

    return directive;
  }

  /**
   * Update directive status to in-progress.
   */
  static async startDirective(
    directiveId: string,
    userId: string,
  ): Promise<IDirective> {
    const directive = await Directive.findById(directiveId);
    if (!directive) throw ApiError.notFound('Directive not found');

    if (directive.status !== DirectiveStatus.ACKNOWLEDGED) {
      throw ApiError.badRequest('Directive must be acknowledged before starting');
    }

    directive.status = DirectiveStatus.IN_PROGRESS;
    directive.statusHistory.push({
      status: DirectiveStatus.IN_PROGRESS,
      changedBy: new mongoose.Types.ObjectId(userId),
      changedAt: new Date(),
      notes: 'Work started on directive',
    });
    await directive.save();

    return directive;
  }

  /**
   * Complete a directive with evidence.
   */
  static async completeDirective(
    directiveId: string,
    userId: string,
    completionNotes: string,
    evidence?: Array<{ url: string; type: string }>,
  ): Promise<IDirective> {
    const directive = await Directive.findById(directiveId);
    if (!directive) throw ApiError.notFound('Directive not found');

    if (![DirectiveStatus.ACKNOWLEDGED, DirectiveStatus.IN_PROGRESS].includes(directive.status)) {
      throw ApiError.badRequest('Directive cannot be completed in its current state');
    }

    directive.status = DirectiveStatus.COMPLETED;
    directive.completedAt = new Date();
    directive.completionNotes = completionNotes;
    if (evidence) directive.completionEvidence = evidence;
    directive.statusHistory.push({
      status: DirectiveStatus.COMPLETED,
      changedBy: new mongoose.Types.ObjectId(userId),
      changedAt: new Date(),
      notes: completionNotes,
    });
    await directive.save();

    // Add to complaint history
    await ComplaintHistory.create({
      complaintId: directive.complaintId,
      action: HistoryAction.STATUS_CHANGED,
      performedBy: userId,
      notes: `CM Directive completed: ${completionNotes}`,
      metadata: { directiveId: directive._id },
    });

    await AuditLog.create({
      action: 'DIRECTIVE_COMPLETED',
      entity: 'Directive',
      entityId: directive._id,
      userId,
      changes: { after: { completionNotes } },
    });

    return directive;
  }

  /**
   * List directives for the CM dashboard with filters.
   */
  static async listDirectives(options?: {
    status?: DirectiveStatus;
    complaintId?: string;
    officerId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (options?.status) filter.status = options.status;
    if (options?.complaintId) filter.complaintId = options.complaintId;
    if (options?.officerId) filter.assignedOfficer = options.officerId;

    const [directives, total] = await Promise.all([
      Directive.find(filter)
        .populate('complaintId', 'referenceNumber title category address')
        .populate('issuedBy', 'name')
        .populate('assignedOfficer', 'name email')
        .populate('assignedDepartment', 'name code')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Directive.countDocuments(filter),
    ]);

    return {
      directives,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get directives assigned to a specific officer.
   */
  static async getOfficerDirectives(officerId: string) {
    return Directive.find({
      assignedOfficer: officerId,
      status: { $ne: DirectiveStatus.COMPLETED },
    })
      .populate('complaintId', 'referenceNumber title category')
      .populate('issuedBy', 'name')
      .sort({ deadline: 1 })
      .lean();
  }

  /**
   * Check for overdue directives and mark them.
   */
  static async checkOverdueDirectives(): Promise<number> {
    const result = await Directive.updateMany(
      {
        status: { $in: [DirectiveStatus.CREATED, DirectiveStatus.ACKNOWLEDGED, DirectiveStatus.IN_PROGRESS] },
        deadline: { $lt: new Date() },
      },
      {
        $set: { status: DirectiveStatus.OVERDUE },
        $push: {
          statusHistory: {
            status: DirectiveStatus.OVERDUE,
            changedAt: new Date(),
            notes: 'Automatically marked overdue — deadline exceeded',
          },
        },
      },
    );

    if (result.modifiedCount > 0) {
      logger.warn(`[Directive] ${result.modifiedCount} directives marked as overdue`);
    }

    return result.modifiedCount;
  }

  /**
   * Dashboard summary statistics for directives.
   */
  static async getDashboardStats() {
    const [total, created, acknowledged, inProgress, completed, overdue] = await Promise.all([
      Directive.countDocuments(),
      Directive.countDocuments({ status: DirectiveStatus.CREATED }),
      Directive.countDocuments({ status: DirectiveStatus.ACKNOWLEDGED }),
      Directive.countDocuments({ status: DirectiveStatus.IN_PROGRESS }),
      Directive.countDocuments({ status: DirectiveStatus.COMPLETED }),
      Directive.countDocuments({ status: DirectiveStatus.OVERDUE }),
    ]);

    return { total, created, acknowledged, inProgress, completed, overdue };
  }
}
