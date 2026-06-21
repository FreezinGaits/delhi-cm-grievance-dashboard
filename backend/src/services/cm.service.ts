import { Complaint, ComplaintStatus, ComplaintPriority } from '../models/Complaint';
import { Department } from '../models/Department';
import { User, UserRole } from '../models/User';
import { Assignment } from '../models/Assignment';

export class CMService {
  /**
   * Get CM dashboard summary data
   */
  static async getDashboardSummary() {
    const [
      totalComplaints,
      openComplaints,
      resolvedToday,
      criticalActive,
      slaBreaches,
      statusCounts,
      categoryCounts,
      recentCritical,
    ] = await Promise.all([
      Complaint.countDocuments({ isDeleted: false }),
      Complaint.countDocuments({ status: { $in: ['submitted', 'assigned', 'in_progress', 'escalated'] }, isDeleted: false }),
      Complaint.countDocuments({
        status: { $in: ['resolved', 'closed'] },
        updatedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        isDeleted: false,
      }),
      Complaint.countDocuments({ isCritical: true, status: { $nin: ['resolved', 'closed'] }, isDeleted: false }),
      Complaint.countDocuments({ 'sla.breached': true, status: { $nin: ['resolved', 'closed'] }, isDeleted: false }),
      Complaint.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Complaint.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Complaint.find({ isCritical: true, status: { $nin: ['resolved', 'closed'] }, isDeleted: false })
        .populate('assignedDepartment', 'name code')
        .populate('assignedOfficer', 'name')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    // Department performance
    const deptPerformance = await Complaint.aggregate([
      { $match: { isDeleted: false, assignedDepartment: { $exists: true } } },
      {
        $group: {
          _id: '$assignedDepartment',
          total: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $in: ['$status', ['resolved', 'closed']] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $in: ['$status', ['submitted', 'assigned', 'in_progress']] }, 1, 0] } },
          slaBreaches: { $sum: { $cond: ['$sla.breached', 1, 0] } },
          critical: { $sum: { $cond: ['$isCritical', 1, 0] } },
        },
      },
    ]);

    // Populate department names
    const deptIds = deptPerformance.map((d) => d._id);
    const departments = await Department.find({ _id: { $in: deptIds } }).select('name code').lean();
    const deptMap = new Map(departments.map((d) => [d._id.toString(), d]));

    const departmentPerformance = deptPerformance.map((d) => ({
      department: deptMap.get(d._id.toString()),
      total: d.total,
      resolved: d.resolved,
      pending: d.pending,
      slaBreaches: d.slaBreaches,
      critical: d.critical,
      resolutionRate: d.total > 0 ? Math.round((d.resolved / d.total) * 100) : 0,
    }));

    // Weekly trend (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    const trendData = await Complaint.aggregate([
      { $match: { createdAt: { $gte: weekAgo }, isDeleted: false } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          submitted: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $in: ['$status', ['resolved', 'closed']] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Compute real citizen satisfaction from feedback
    const feedbackStats = await Complaint.aggregate([
      { $match: { isDeleted: false, 'citizenFeedback.respondedAt': { $exists: true } } },
      {
        $group: {
          _id: null,
          totalResponses: { $sum: 1 },
          confirmed: { $sum: { $cond: ['$citizenFeedback.isConfirmed', 1, 0] } },
          avgRating: { $avg: { $ifNull: ['$citizenFeedback.rating', 3] } },
        },
      },
    ]);
    const fb = feedbackStats[0];
    const citizenSatisfaction = fb && fb.totalResponses > 0
      ? Math.round((fb.confirmed / fb.totalResponses) * 100 * 10) / 10
      : 0;

    // SLA analytics per department
    const slaAnalytics = await Complaint.aggregate([
      { $match: { isDeleted: false, assignedDepartment: { $exists: true } } },
      {
        $group: {
          _id: '$assignedDepartment',
          total: { $sum: 1 },
          breached: { $sum: { $cond: ['$sla.breached', 1, 0] } },
          resolved: { $sum: { $cond: [{ $in: ['$status', ['resolved', 'closed']] }, 1, 0] } },
          avgResolutionMs: {
            $avg: {
              $cond: [
                { $in: ['$status', ['resolved', 'closed']] },
                { $subtract: ['$updatedAt', '$createdAt'] },
                null,
              ],
            },
          },
        },
      },
    ]);

    // Populate SLA department names
    const slaDeptIds = slaAnalytics.map((s) => s._id);
    const slaDepts = await Department.find({ _id: { $in: slaDeptIds } }).select('name code slaHours').lean();
    const slaDeptMap = new Map(slaDepts.map((d) => [d._id.toString(), d]));

    const slaReport = slaAnalytics.map((s) => {
      const dept = slaDeptMap.get(s._id.toString());
      const complianceRate = s.total > 0 ? Math.round(((s.total - s.breached) / s.total) * 100 * 10) / 10 : 100;
      const avgHours = s.avgResolutionMs ? Math.round(s.avgResolutionMs / 3600000 * 10) / 10 : 0;
      return {
        department: dept ? { name: dept.name, code: dept.code } : { name: 'Unknown', code: 'UNK' },
        slaTarget: (dept as any)?.slaHours ? `${(dept as any).slaHours} Hours` : '48 Hours',
        total: s.total,
        breached: s.breached,
        complianceRate,
        avgResolutionHours: avgHours,
      };
    });

    const overallAvgResolution = slaReport.length > 0
      ? Math.round(slaReport.reduce((sum, s) => sum + s.avgResolutionHours, 0) / slaReport.length * 10) / 10
      : 0;
    const overallCompliance = totalComplaints > 0
      ? Math.round(((totalComplaints - slaBreaches) / totalComplaints) * 100 * 10) / 10
      : 100;

    // ── Calculate Delhi Happiness Index & Worst Performing Zones ──
    const totalResolved = totalComplaints - openComplaints;
    const overallResolutionRate = totalComplaints > 0
      ? Math.round((totalResolved / totalComplaints) * 100 * 10) / 10
      : 100;

    const worstZonesRaw = await Complaint.aggregate([
      { $match: { isDeleted: false, 'address.ward': { $exists: true, $ne: '' } } },
      {
        $group: {
          _id: '$address.ward',
          total: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $in: ['$status', ['resolved', 'closed']] }, 1, 0] } },
          unresolved: { $sum: { $cond: [{ $in: ['$status', ['submitted', 'assigned', 'in_progress', 'escalated']] }, 1, 0] } },
          slaBreaches: { $sum: { $cond: ['$sla.breached', 1, 0] } },
        }
      },
      {
        $project: {
          zone: '$_id',
          total: 1,
          resolved: 1,
          unresolved: 1,
          slaBreaches: 1,
          resolutionRate: {
            $cond: [
              { $gt: ['$total', 0] },
              { $round: [{ $multiply: [{ $divide: ['$resolved', '$total'] }, 100] }, 1] },
              0
            ]
          }
        }
      },
      { $sort: { unresolved: -1, resolutionRate: 1 } },
      { $limit: 3 }
    ]);

    const worstZones = worstZonesRaw.map(z => ({
      zone: z.zone || 'Unknown Zone',
      total: z.total,
      unresolved: z.unresolved,
      resolutionRate: z.resolutionRate,
      slaBreaches: z.slaBreaches,
    }));

    return {
      summary: {
        totalComplaints,
        openComplaints,
        resolvedToday,
        criticalActive,
        slaBreaches,
        citizenSatisfaction,
      },
      statusBreakdown: Object.fromEntries(statusCounts.map((s: { _id: string; count: number }) => [s._id, s.count])),
      categoryBreakdown: categoryCounts,
      departmentPerformance,
      recentCritical,
      trendData,
      slaReport,
      slaOverview: {
        avgResolutionHours: overallAvgResolution,
        overallCompliance,
        unresolvedBreaches: slaBreaches,
      },
      happinessIndex: {
        score: overallResolutionRate,
        target: 85,
        rating: overallResolutionRate >= 85 ? 'Excellent' : overallResolutionRate >= 70 ? 'Satisfactory' : 'Critical',
      },
      worstZones,
    };
  }

  /**
   * Get heatmap data for complaint density
   */
  static async getHeatmapData(filters?: { category?: string; status?: string; dateFrom?: string; dateTo?: string }) {
    const match: Record<string, unknown> = { isDeleted: false, 'location.coordinates': { $exists: true } };

    if (filters?.category) match.category = filters.category;
    if (filters?.status) match.status = filters.status;
    if (filters?.dateFrom || filters?.dateTo) {
      match.createdAt = {};
      if (filters.dateFrom) (match.createdAt as Record<string, unknown>).$gte = new Date(filters.dateFrom);
      if (filters.dateTo) (match.createdAt as Record<string, unknown>).$lte = new Date(filters.dateTo);
    }

    const complaints = await Complaint.find(match)
      .select('location category priority status isCritical title referenceNumber')
      .lean();

    return complaints.map((c) => ({
      _id: c._id,
      lat: c.location.coordinates[1],
      lng: c.location.coordinates[0],
      category: c.category,
      priority: c.priority,
      status: c.status,
      isCritical: c.isCritical,
      title: c.title,
      referenceNumber: c.referenceNumber,
    }));
  }

  /**
   * Get nearby complaints for field visit mode
   */
  static async getNearbyComplaints(lat: number, lng: number, radiusMeters: number) {
    const complaints = await Complaint.find({
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: radiusMeters,
        },
      },
      status: { $in: ['submitted', 'assigned', 'in_progress', 'escalated'] },
      isDeleted: false,
    })
      .populate('assignedDepartment', 'name code')
      .populate('assignedOfficer', 'name')
      .limit(50)
      .lean();

    return complaints;
  }

  /**
   * Get officer resource ledger
   */
  static async getOfficerLedger() {
    const officers = await User.find({
      role: { $in: [UserRole.OFFICER, UserRole.DEPARTMENT_HEAD] },
    })
      .populate('departmentId', 'name code')
      .lean();

    const officerStats = await Promise.all(
      officers.map(async (officer: any) => {
        const activeCount = await Complaint.countDocuments({
          assignedOfficer: officer._id,
          status: { $in: ['assigned', 'in_progress'] },
          isDeleted: false,
        });
        const resolvedCount = await Complaint.countDocuments({
          assignedOfficer: officer._id,
          status: { $in: ['resolved', 'closed'] },
          isDeleted: false,
        });
        const maxCapacity = 50;
        const loadPercent = Math.round((activeCount / maxCapacity) * 100);

        return {
          officer: { 
            id: officer._id, 
            name: `${officer.name.first} ${officer.name.last}`, 
            ward: officer.ward,
            isSuspended: officer.isSuspended || false,
            suspensionReason: officer.suspensionReason || null,
            warnings: officer.warnings || []
          },
          department: officer.departmentId,
          activeTickets: activeCount,
          resolvedTickets: resolvedCount,
          loadPercent,
          status: officer.isSuspended ? 'suspended' : loadPercent > 100 ? 'overloaded' : loadPercent > 75 ? 'busy' : 'available',
          bandwidth: officer.isSuspended ? 0 : Math.max(0, 100 - loadPercent),
        };
      }),
    );

    return officerStats.sort((a, b) => b.loadPercent - a.loadPercent);
  }

  /**
   * Issue a spot directive for a complaint
   */
  static async issueSpotDirective(complaintId: string, directive: string, priority: string, cmUserId: string) {
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) throw new Error('Complaint not found');

    complaint.spotDirective = {
      directive,
      issuedBy: cmUserId as any,
      issuedAt: new Date(),
      priority: priority as 'immediate' | 'within_24h' | 'within_week',
    };
    await complaint.save();

    const { ComplaintHistory, HistoryAction } = await import('../models/ComplaintHistory');
    await ComplaintHistory.create({
      complaintId: complaint._id,
      action: HistoryAction.DIRECTIVE_ISSUED,
      performedBy: cmUserId,
      notes: `Spot directive: ${directive} (Priority: ${priority})`,
    });

    return complaint;
  }
}
