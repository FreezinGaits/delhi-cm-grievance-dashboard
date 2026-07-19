import mongoose from 'mongoose';
import { Complaint, ComplaintStatus, ComplaintPriority, ComplaintSource, IComplaint } from '../models/Complaint';
import { ComplaintHistory, HistoryAction } from '../models/ComplaintHistory';
import { Department } from '../models/Department';
import { AuditLog } from '../models/AuditLog';
import { Counter } from '../models/Counter';
import { ApiError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';
import { createQueues } from '../workers/queue';

// Critical keywords for auto-detection
const CRITICAL_KEYWORDS = [
  'open manhole', 'manhole', 'live wire', 'dangling wire', 'electrocution',
  'gas leak', 'structural collapse', 'building collapse', 'fire',
  'waterlogging danger', 'flood', 'deep pothole', 'sinkhole',
  'sewage overflow', 'toxic', 'contamination',
];

// Category-to-department mapping
const CATEGORY_DEPT_MAP: Record<string, string> = {
  'Water Supply': 'DJB',
  'Roads': 'PWD',
  'Sanitation': 'MCD',
  'Electricity': 'BSES',
  'Law & Order': 'POLICE',
};

interface CreateComplaintData {
  citizenId: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  latitude: number;
  longitude: number;
  address?: {
    street?: string;
    ward?: string;
    district?: string;
    pincode?: string;
    landmark?: string;
    fullAddress?: string;
  };
  media?: Array<{
    type: 'image' | 'video' | 'audio' | 'document';
    url: string;
    thumbnailUrl?: string;
    mimeType: string;
    size: number;
  }>;
  source?: ComplaintSource;
}

interface ListComplaintsQuery {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  category?: string;
  district?: string;
  ward?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  citizenId?: string;
  officerId?: string;
  departmentId?: string;
}

export class ComplaintService {
  /**
   * Generate unique reference number: DEL-YYYYMMDD-XXXXX
   */
  private static async generateReferenceNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `DEL-${dateStr}-`;

    const counter = await Counter.findOneAndUpdate(
      { _id: prefix },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    return `${prefix}${String(counter.seq).padStart(5, '0')}`;
  }

  /**
   * Detect if a complaint is critical based on keywords
   */
  private static detectCritical(title: string, description: string): { isCritical: boolean; reason?: string } {
    const text = `${title} ${description}`.toLowerCase();
    for (const keyword of CRITICAL_KEYWORDS) {
      if (text.includes(keyword)) {
        return { isCritical: true, reason: `Auto-detected critical keyword: "${keyword}"` };
      }
    }
    return { isCritical: false };
  }

  /**
   * Auto-route complaint to department based on category
   */
  private static async autoRoute(category: string): Promise<mongoose.Types.ObjectId | undefined> {
    let deptCode = CATEGORY_DEPT_MAP[category];
    if (!deptCode) deptCode = 'GENERAL';

    let dept = await Department.findOne({ code: deptCode, isActive: true });
    
    // Fallback if GENERAL doesn't exist either
    if (!dept) {
      dept = await Department.findOne({ isActive: true });
    }
    
    return dept?._id as mongoose.Types.ObjectId | undefined;
  }

  /**
   * Create a new complaint
   */
  static async createComplaint(data: CreateComplaintData): Promise<IComplaint> {
    // Validate coordinates are within Delhi bounds roughly
    if (
      data.latitude < 28.4 || data.latitude > 28.9 ||
      data.longitude < 76.8 || data.longitude > 77.3
    ) {
      throw ApiError.badRequest('Location coordinates are outside of Delhi boundaries.');
    }

    const referenceNumber = await this.generateReferenceNumber();

    // Auto-detect critical
    const { isCritical, reason } = this.detectCritical(data.title, data.description);
    const priority = isCritical ? ComplaintPriority.CRITICAL : ComplaintPriority.NORMAL;

    // Auto-route to department
    const assignedDepartment = await this.autoRoute(data.category);

    // Calculate SLA deadline
    let slaDeadline: Date | undefined;
    if (assignedDepartment) {
      const dept = await Department.findById(assignedDepartment);
      if (dept) {
        const hours = isCritical ? dept.slaDefaults.critical : dept.slaDefaults.normal;
        slaDeadline = new Date(Date.now() + hours * 3600000);
      }
    }

    const complaint = await Complaint.create({
      referenceNumber,
      citizenId: data.citizenId,
      title: data.title,
      description: data.description,
      category: data.category,
      subcategory: data.subcategory,
      status: ComplaintStatus.SUBMITTED,
      priority,
      location: {
        type: 'Point',
        coordinates: [data.longitude, data.latitude],
      },
      address: data.address || {},
      media: data.media || [],
      assignedDepartment,
      sla: slaDeadline ? { deadline: slaDeadline, breached: false } : { breached: false },
      isCritical,
      criticalReason: reason,
      source: data.source || ComplaintSource.WEB,
      tags: [data.category.toLowerCase()],
    });

    // Create history entry
    await ComplaintHistory.create({
      complaintId: complaint._id,
      action: HistoryAction.CREATED,
      toStatus: ComplaintStatus.SUBMITTED,
      performedBy: data.citizenId,
      notes: `Complaint submitted via ${data.source || 'web'}`,
    });

    if (assignedDepartment) {
      await ComplaintHistory.create({
        complaintId: complaint._id,
        action: HistoryAction.CLASSIFIED,
        notes: `Auto-routed to department based on category: ${data.category}`,
      });
    }

    logger.info(`Complaint created: ${referenceNumber} (${data.category}) - Critical: ${isCritical}`);

    // Dispatch async AI analysis via BullMQ
    try {
      const queues = createQueues();
      if (queues?.aiAnalysis) {
        await queues.aiAnalysis.add(
          'analyze-complaint',
          { complaintId: complaint._id.toString() },
          { removeOnComplete: { count: 50 }, removeOnFail: { count: 10 } },
        );
        logger.info(`[AI] Queued analysis for complaint ${referenceNumber}`);
      }
    } catch (err) {
      logger.warn(`[AI] Failed to queue analysis for ${referenceNumber}: ${err}`);
    }

    return complaint;
  }

  /**
   * List complaints with filters and pagination
   */
  static async listComplaints(query: ListComplaintsQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    // Build filter
    const filter: Record<string, unknown> = { isDeleted: false };

    if (query.status) filter.status = query.status;
    if (query.priority) filter.priority = query.priority;
    if (query.category) filter.category = query.category;
    if (query.district) filter['address.district'] = query.district;
    if (query.ward) filter['address.ward'] = query.ward;
    if (query.citizenId) filter.citizenId = query.citizenId;
    if (query.officerId) filter.assignedOfficer = query.officerId;
    if (query.departmentId) filter.assignedDepartment = query.departmentId;

    if (query.dateFrom || query.dateTo) {
      filter.createdAt = {};
      if (query.dateFrom) (filter.createdAt as Record<string, unknown>).$gte = new Date(query.dateFrom);
      if (query.dateTo) (filter.createdAt as Record<string, unknown>).$lte = new Date(query.dateTo);
    }

    if (query.search) {
      filter.$or = [
        { title: { $regex: query.search, $options: 'i' } },
        { description: { $regex: query.search, $options: 'i' } },
        { referenceNumber: { $regex: query.search, $options: 'i' } },
      ];
    }

    // Sort
    const sortField = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const [complaints, total] = await Promise.all([
      Complaint.find(filter)
        .populate('citizenId', 'name phone')
        .populate('assignedDepartment', 'name code')
        .populate('assignedOfficer', 'name email')
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      Complaint.countDocuments(filter),
    ]);

    return {
      complaints,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get complaint by ID
   */
  static async getComplaintById(id: string): Promise<IComplaint> {
    const complaint = await Complaint.findById(id)
      .populate('citizenId', 'name phone email')
      .populate('assignedDepartment', 'name code contactEmail')
      .populate('assignedOfficer', 'name email phone');

    if (!complaint) {
      throw ApiError.notFound('Complaint not found');
    }

    return complaint;
  }

  /**
   * Track complaint by reference number (public)
   */
  static async trackComplaint(referenceNumber: string) {
    const complaint = await Complaint.findOne({ referenceNumber })
      .populate('assignedDepartment', 'name code')
      .select('referenceNumber title category status priority createdAt updatedAt assignedDepartment sla.deadline');

    if (!complaint) {
      throw ApiError.notFound('Complaint not found. Please check the reference number');
    }

    // Get timeline
    const history = await ComplaintHistory.find({ complaintId: complaint._id })
      .sort({ createdAt: 1 })
      .select('action fromStatus toStatus notes createdAt')
      .lean();

    return { complaint, history };
  }

  // Valid state machine transitions (key -> allowed next states)
  private static readonly VALID_TRANSITIONS: Record<string, string[]> = {
    [ComplaintStatus.SUBMITTED]: [ComplaintStatus.UNDER_REVIEW, ComplaintStatus.ASSIGNED, ComplaintStatus.ESCALATED],
    [ComplaintStatus.UNDER_REVIEW]: [ComplaintStatus.ASSIGNED, ComplaintStatus.ESCALATED],
    [ComplaintStatus.ASSIGNED]: [ComplaintStatus.IN_PROGRESS, ComplaintStatus.ESCALATED],
    [ComplaintStatus.IN_PROGRESS]: [ComplaintStatus.PROVISIONALLY_RESOLVED, ComplaintStatus.ESCALATED],
    [ComplaintStatus.PROVISIONALLY_RESOLVED]: [ComplaintStatus.RESOLVED, ComplaintStatus.REJECTED, ComplaintStatus.ESCALATED],
    [ComplaintStatus.RESOLVED]: [ComplaintStatus.CLOSED],
    [ComplaintStatus.REJECTED]: [ComplaintStatus.IN_PROGRESS, ComplaintStatus.ASSIGNED, ComplaintStatus.ESCALATED],
    [ComplaintStatus.ESCALATED]: [ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS],
    [ComplaintStatus.CLOSED]: [], // terminal state
  };

  /**
   * Update complaint status with state-machine transition validation
   */
  static async updateStatus(
    complaintId: string,
    newStatus: ComplaintStatus,
    userId: string,
    notes?: string,
  ): Promise<IComplaint> {
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) throw ApiError.notFound('Complaint not found');

    const oldStatus = complaint.status;

    // Validate transition (escalated is always allowed as a CM override)
    const allowed = this.VALID_TRANSITIONS[oldStatus] || [];
    if (newStatus !== ComplaintStatus.ESCALATED && !allowed.includes(newStatus)) {
      throw ApiError.badRequest(
        `Invalid status transition: ${oldStatus} → ${newStatus}. Allowed: ${allowed.join(', ') || 'none (terminal state)'}`,
      );
    }

    complaint.status = newStatus;

    if (newStatus === ComplaintStatus.ESCALATED) {
      complaint.priority = ComplaintPriority.CRITICAL;
      complaint.isCritical = true;
      const level = (complaint.escalationLevel || 0) + 1;
      complaint.escalationLevel = level;
      complaint.escalationHistory.push({
        level,
        reason: notes || 'Escalated to Critical by CM during field visit / map review',
        escalatedAt: new Date(),
        escalatedBy: new mongoose.Types.ObjectId(userId),
      });

      // Recalculate SLA based on department's critical defaults
      if (complaint.assignedDepartment) {
        const dept = await Department.findById(complaint.assignedDepartment);
        if (dept) {
          const hours = dept.slaDefaults.critical;
          complaint.sla = {
            deadline: new Date(Date.now() + hours * 3600000),
            breached: false,
          };
        }
      }
    }

    await complaint.save();

    await ComplaintHistory.create({
      complaintId: complaint._id,
      action: HistoryAction.STATUS_CHANGED,
      fromStatus: oldStatus,
      toStatus: newStatus,
      performedBy: userId,
      notes,
    });

    await AuditLog.create({
      action: 'COMPLAINT_STATUS_CHANGED',
      entity: 'Complaint',
      entityId: complaint._id,
      userId,
      changes: { before: { status: oldStatus }, after: { status: newStatus } },
    });

    return complaint;
  }

  /**
   * Get complaint history/timeline
   */
  static async getComplaintHistory(complaintId: string) {
    const history = await ComplaintHistory.find({ complaintId })
      .populate('performedBy', 'name role')
      .sort({ createdAt: 1 })
      .lean();

    return history;
  }
}
