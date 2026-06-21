import mongoose from 'mongoose';
import { OfficerScore, PerformanceCategory, IOfficerScore } from '../models/OfficerScore';
import { Complaint, ComplaintStatus } from '../models/Complaint';
import { User, UserRole } from '../models/User';
import { Department } from '../models/Department';
import { AuditLog } from '../models/AuditLog';
import { logger } from '../utils/logger';

/**
 * Accountability Score Engine.
 *
 * Computes weighted performance scores for officers based on:
 *   - Resolution Rate (25%)
 *   - Citizen Satisfaction (20%)
 *   - SLA Compliance (20%)
 *   - Average Resolution Time (15%)
 *   - Escalation Penalty (10%)
 *   - Rejection Penalty (5%)
 *   - Critical Case Performance (5%)
 */

const WEIGHTS = {
  resolutionRate: 0.25,
  citizenSatisfaction: 0.20,
  slaCompliance: 0.20,
  avgResolutionTime: 0.15,
  escalationPenalty: 0.10,
  rejectionPenalty: 0.05,
  criticalCasePerformance: 0.05,
};

// Maximum expected resolution time in hours (for scoring normalization)
const MAX_RESOLUTION_HOURS = 168; // 7 days

// Ensure Department schema is registered in Mongoose
const _deptModelReference = Department;

export class AccountabilityService {
  /**
   * Compute scores for all officers for a given period.
   * Called by BullMQ cron worker (e.g., weekly on Sunday midnight).
   */
  static async computeAllScores(
    periodType: 'weekly' | 'monthly' | 'quarterly' = 'weekly',
  ): Promise<{ officersScored: number; avgScore: number }> {
    const startTime = Date.now();

    const { startDate, endDate } = this.getPeriodDates(periodType);

    // Find all active officers
    const officers = await User.find({
      role: { $in: [UserRole.OFFICER, UserRole.DEPARTMENT_HEAD] },
      isActive: true,
      isDeleted: false,
    }).select('_id departmentId').lean();

    const scores: IOfficerScore[] = [];

    for (const officer of officers) {
      const score = await this.computeOfficerScore(
        officer._id as mongoose.Types.ObjectId,
        officer.departmentId as mongoose.Types.ObjectId,
        periodType,
        startDate,
        endDate,
      );
      if (score) scores.push(score);
    }

    // Compute rankings
    await this.computeRankings(scores);

    const avgScore =
      scores.length > 0
        ? scores.reduce((sum, s) => sum + s.overallScore, 0) / scores.length
        : 0;

    const elapsed = Date.now() - startTime;
    logger.info(
      `[Accountability] Scored ${scores.length} officers in ${elapsed}ms. ` +
      `Average: ${avgScore.toFixed(1)}. Period: ${periodType}`,
    );

    return { officersScored: scores.length, avgScore };
  }

  /**
   * Compute the performance score for a single officer.
   */
  static async computeOfficerScore(
    officerId: mongoose.Types.ObjectId,
    departmentId: mongoose.Types.ObjectId,
    periodType: 'weekly' | 'monthly' | 'quarterly',
    startDate: Date,
    endDate: Date,
  ): Promise<IOfficerScore | null> {
    const dateFilter = { $gte: startDate, $lte: endDate };

    // All complaints assigned to this officer in the period
    const allComplaints = await Complaint.find({
      assignedOfficer: officerId,
      createdAt: dateFilter,
      isDeleted: false,
    })
      .select('status priority sla citizenFeedback escalationLevel createdAt updatedAt isCritical')
      .lean();

    if (allComplaints.length === 0) return null;

    const total = allComplaints.length;

    // ── Resolution Rate ─────────────────────────────────
    const resolved = allComplaints.filter((c) =>
      [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED].includes(c.status as ComplaintStatus),
    ).length;
    const resolutionRate = (resolved / total) * 100;

    // ── Citizen Satisfaction ────────────────────────────
    const rated = allComplaints.filter((c) => c.citizenFeedback?.rating);
    const avgRating =
      rated.length > 0
        ? rated.reduce((sum, c) => sum + (c.citizenFeedback?.rating || 0), 0) / rated.length
        : 3; // Default neutral
    const citizenSatisfaction = (avgRating / 5) * 100;

    // ── SLA Compliance ──────────────────────────────────
    const withSla = allComplaints.filter((c) => c.sla?.deadline);
    const slaMet = withSla.filter((c) => !c.sla?.breached).length;
    const slaCompliance = withSla.length > 0 ? (slaMet / withSla.length) * 100 : 100;

    // ── Average Resolution Time ─────────────────────────
    const resolvedComplaints = allComplaints.filter(
      (c) => [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED].includes(c.status as ComplaintStatus),
    );
    let avgResolutionTimeHours = 0;
    if (resolvedComplaints.length > 0) {
      const totalHours = resolvedComplaints.reduce((sum, c) => {
        const created = new Date(c.createdAt).getTime();
        const updated = new Date(c.updatedAt).getTime();
        return sum + (updated - created) / 3600000;
      }, 0);
      avgResolutionTimeHours = totalHours / resolvedComplaints.length;
    }
    // Normalize: lower is better. Score = 100 * (1 - time/max)
    const resolutionTimeScore = Math.max(
      0,
      100 * (1 - avgResolutionTimeHours / MAX_RESOLUTION_HOURS),
    );

    // ── Escalation Penalty ──────────────────────────────
    const escalated = allComplaints.filter((c) => c.escalationLevel > 0).length;
    const escalationScore = Math.max(0, 100 - (escalated / total) * 200);

    // ── Rejection Penalty ───────────────────────────────
    const rejected = allComplaints.filter(
      (c) => c.citizenFeedback?.isConfirmed === false,
    ).length;
    const rejectionScore = Math.max(0, 100 - (rejected / total) * 200);

    // ── Critical Case Performance ───────────────────────
    const criticalCases = allComplaints.filter((c) => c.isCritical);
    let criticalPerformance = 100;
    if (criticalCases.length > 0) {
      const criticalResolved = criticalCases.filter((c) =>
        [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED].includes(c.status as ComplaintStatus),
      ).length;
      criticalPerformance = (criticalResolved / criticalCases.length) * 100;
    }

    // ── Weighted Overall Score ──────────────────────────
    const overallScore = Math.round(
      resolutionRate * WEIGHTS.resolutionRate +
      citizenSatisfaction * WEIGHTS.citizenSatisfaction +
      slaCompliance * WEIGHTS.slaCompliance +
      resolutionTimeScore * WEIGHTS.avgResolutionTime +
      escalationScore * WEIGHTS.escalationPenalty +
      rejectionScore * WEIGHTS.rejectionPenalty +
      criticalPerformance * WEIGHTS.criticalCasePerformance,
    );

    // ── Category Classification ─────────────────────────
    let category: PerformanceCategory;
    if (overallScore >= 85) category = PerformanceCategory.EXCELLENT;
    else if (overallScore >= 65) category = PerformanceCategory.GOOD;
    else if (overallScore >= 40) category = PerformanceCategory.NEEDS_ATTENTION;
    else category = PerformanceCategory.CRITICAL;

    // ── Trend Calculation ───────────────────────────────
    const priorScore = await OfficerScore.findOne({
      officerId,
      'period.type': periodType,
      'period.endDate': { $lt: startDate },
    })
      .sort({ 'period.endDate': -1 })
      .select('overallScore')
      .lean();

    const trend = priorScore ? overallScore - priorScore.overallScore : 0;

    // ── Upsert Score Record ─────────────────────────────
    const score = await OfficerScore.findOneAndUpdate(
      {
        officerId,
        'period.type': periodType,
        'period.startDate': startDate,
      },
      {
        officerId,
        departmentId,
        period: { type: periodType, startDate, endDate },
        metrics: {
          resolutionRate,
          citizenSatisfaction,
          avgResolutionTimeHours,
          slaCompliance,
          escalationCount: escalated,
          rejectedResolutions: rejected,
          criticalCasePerformance: criticalPerformance,
        },
        overallScore,
        category,
        totalComplaintsHandled: total,
        trend,
      },
      { upsert: true, new: true },
    );

    return score;
  }

  /**
   * Compute and assign rankings among officers.
   */
  private static async computeRankings(scores: IOfficerScore[]): Promise<void> {
    // Global ranking by overall score
    const sorted = [...scores].sort((a, b) => b.overallScore - a.overallScore);
    for (let i = 0; i < sorted.length; i++) {
      sorted[i].globalRank = i + 1;
    }

    // Department rankings
    const byDept = new Map<string, IOfficerScore[]>();
    for (const score of scores) {
      const deptId = score.departmentId.toString();
      if (!byDept.has(deptId)) byDept.set(deptId, []);
      byDept.get(deptId)!.push(score);
    }

    for (const deptScores of byDept.values()) {
      const deptSorted = deptScores.sort((a, b) => b.overallScore - a.overallScore);
      for (let i = 0; i < deptSorted.length; i++) {
        deptSorted[i].departmentRank = i + 1;
      }
    }

    // Batch save
    await Promise.all(scores.map((s) => s.save()));
  }

  /**
   * Get officer rankings for the CM dashboard.
   */
  static async getOfficerRankings(
    periodType: 'weekly' | 'monthly' | 'quarterly' = 'weekly',
    options?: { departmentId?: string; limit?: number; sortBy?: 'top' | 'bottom' },
  ) {
    const { startDate } = this.getPeriodDates(periodType);
    const limit = options?.limit || 20;

    const filter: Record<string, unknown> = {
      'period.type': periodType,
      'period.startDate': { $gte: startDate },
    };

    if (options?.departmentId) {
      filter.departmentId = new mongoose.Types.ObjectId(options.departmentId);
    }

    const sortDirection = options?.sortBy === 'bottom' ? 1 : -1;

    const rankings = await OfficerScore.find(filter)
      .populate('officerId', 'name email phone ward')
      .populate('departmentId', 'name code')
      .sort({ overallScore: sortDirection })
      .limit(limit)
      .lean();

    return rankings;
  }

  /**
   * Get a single officer's performance history
   */
  static async getOfficerHistory(officerId: string, periodType?: string) {
    const filter: Record<string, unknown> = { officerId };
    if (periodType) filter['period.type'] = periodType;

    return OfficerScore.find(filter)
      .sort({ 'period.startDate': -1 })
      .limit(12)
      .lean();
  }

  /**
   * Calculate period start/end dates
   */
  private static getPeriodDates(periodType: string): { startDate: Date; endDate: Date } {
    const now = new Date();
    const endDate = new Date(now);
    let startDate: Date;

    switch (periodType) {
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarterly':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      case 'weekly':
      default:
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
        startDate.setHours(0, 0, 0, 0);
        break;
    }

    return { startDate, endDate };
  }
}
