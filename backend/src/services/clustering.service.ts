import mongoose from 'mongoose';
import { Complaint, ComplaintStatus } from '../models/Complaint';
import { ComplaintCluster, IComplaintCluster } from '../models/ComplaintCluster';
import { ComplaintHistory, HistoryAction } from '../models/ComplaintHistory';
import { AuditLog } from '../models/AuditLog';
import { logger } from '../utils/logger';

/**
 * DBSCAN-inspired spatial clustering engine.
 *
 * Groups unresolved complaints that share:
 *   - Same category
 *   - Within 50-meter radius
 *   - Same locality / ward
 *
 * Citizen complaints remain individually visible.
 * Only the operational workflow is clustered (single officer dispatch).
 */

const CLUSTER_RADIUS_METERS = 50;
const MIN_CLUSTER_SIZE = 2; // Minimum points to form a cluster

export class ClusteringService {
  /**
   * Run the clustering algorithm across all unclustered, unresolved complaints.
   * This should be called periodically (e.g., via a BullMQ cron job).
   */
  static async runClustering(): Promise<{
    newClusters: number;
    updatedClusters: number;
    complaintsProcessed: number;
  }> {
    const startTime = Date.now();
    let newClusters = 0;
    let updatedClusters = 0;
    let complaintsProcessed = 0;

    // Find unclustered, unresolved complaints
    const unresolvedStatuses = [
      ComplaintStatus.SUBMITTED,
      ComplaintStatus.UNDER_REVIEW,
      ComplaintStatus.ASSIGNED,
      ComplaintStatus.IN_PROGRESS,
      ComplaintStatus.ESCALATED,
    ];

    const unclusteredComplaints = await Complaint.find({
      clusterId: { $exists: false },
      status: { $in: unresolvedStatuses },
      isDeleted: false,
      'location.coordinates': { $exists: true },
    })
      .select('_id location category address citizenId')
      .lean();

    logger.info(
      `[Clustering] Found ${unclusteredComplaints.length} unclustered complaints to process`,
    );

    // Group by category first (only same-category complaints can cluster)
    const byCategory = new Map<string, typeof unclusteredComplaints>();
    for (const complaint of unclusteredComplaints) {
      const [lng, lat] = complaint.location.coordinates;
      // Skip default fallback coordinates to avoid mega-clusters
      if (lng === 77.2090 && lat === 28.6139) continue;

      const cat = complaint.category;
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(complaint);
    }

    // For each category, run spatial clustering
    for (const [category, complaints] of byCategory) {
      const result = await this.clusterCategory(category, complaints);
      newClusters += result.newClusters;
      updatedClusters += result.updatedClusters;
      complaintsProcessed += result.complaintsProcessed;
    }

    const elapsed = Date.now() - startTime;
    logger.info(
      `[Clustering] Complete in ${elapsed}ms: ${newClusters} new clusters, ` +
      `${updatedClusters} updated, ${complaintsProcessed} complaints processed`,
    );

    return { newClusters, updatedClusters, complaintsProcessed };
  }

  /**
   * Cluster complaints within a single category using spatial proximity.
   */
  private static async clusterCategory(
    category: string,
    complaints: Array<{
      _id: mongoose.Types.ObjectId;
      location: { type: string; coordinates: [number, number] };
      category: string;
      address?: { ward?: string };
      citizenId: mongoose.Types.ObjectId;
    }>,
  ): Promise<{ newClusters: number; updatedClusters: number; complaintsProcessed: number }> {
    let newClusters = 0;
    let updatedClusters = 0;
    let complaintsProcessed = 0;

    const visited = new Set<string>();

    for (const complaint of complaints) {
      const idStr = complaint._id.toString();
      if (visited.has(idStr)) continue;

      // Check if this complaint is near an existing active cluster
      const existingCluster = await ComplaintCluster.findOne({
        category,
        status: 'active',
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: complaint.location.coordinates,
            },
            $maxDistance: CLUSTER_RADIUS_METERS,
          },
        },
      });

      if (existingCluster) {
        // Add to existing cluster
        await this.addToCluster(existingCluster, complaint);
        visited.add(idStr);
        updatedClusters++;
        complaintsProcessed++;
        continue;
      }

      // Find all nearby complaints in the same category (DBSCAN neighborhood)
      const neighbors = await Complaint.find({
        _id: { $ne: complaint._id, $nin: Array.from(visited).map((id) => new mongoose.Types.ObjectId(id)) },
        category,
        clusterId: { $exists: false },
        status: {
          $in: [
            ComplaintStatus.SUBMITTED,
            ComplaintStatus.UNDER_REVIEW,
            ComplaintStatus.ASSIGNED,
            ComplaintStatus.IN_PROGRESS,
            ComplaintStatus.ESCALATED,
          ],
        },
        isDeleted: false,
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: complaint.location.coordinates,
            },
            $maxDistance: CLUSTER_RADIUS_METERS,
          },
        },
      })
        .select('_id citizenId')
        .lean();

      if (neighbors.length >= MIN_CLUSTER_SIZE - 1) {
        // Create a new cluster with this complaint as master
        const allIds = [complaint._id, ...neighbors.map((n) => n._id)];
        const citizenIds = [complaint.citizenId, ...neighbors.map((n) => n.citizenId)];

        const cluster = await ComplaintCluster.create({
          masterComplaintId: complaint._id,
          subscriberComplaintIds: neighbors.map((n) => n._id),
          subscriberCitizenIds: [...new Set(citizenIds.map((id) => id.toString()))].map(
            (id) => new mongoose.Types.ObjectId(id),
          ),
          location: complaint.location,
          category,
          radius: CLUSTER_RADIUS_METERS,
          complaintCount: allIds.length,
          status: 'active',
        });

        // Mark the master complaint
        await Complaint.findByIdAndUpdate(complaint._id, {
          clusterId: cluster._id,
          isMasterTicket: true,
          subscriberCount: neighbors.length,
        });

        // Mark all neighbor complaints
        for (const neighbor of neighbors) {
          await Complaint.findByIdAndUpdate(neighbor._id, {
            clusterId: cluster._id,
            isMasterTicket: false,
          });
          visited.add(neighbor._id.toString());
        }

        // Create history entries
        for (const id of allIds) {
          await ComplaintHistory.create({
            complaintId: id,
            action: HistoryAction.CLUSTERED,
            notes: `Grouped into cluster. Master ticket: ${complaint._id}. Total: ${allIds.length} complaints.`,
            metadata: { clusterId: cluster._id, masterComplaintId: complaint._id },
          });
        }

        // Audit log
        await AuditLog.create({
          action: 'CLUSTER_CREATED',
          entity: 'ComplaintCluster',
          entityId: cluster._id,
          changes: {
            after: {
              category,
              complaintCount: allIds.length,
              masterComplaintId: complaint._id,
              radius: CLUSTER_RADIUS_METERS,
            },
          },
        });

        visited.add(idStr);
        newClusters++;
        complaintsProcessed += allIds.length;
      } else {
        visited.add(idStr);
      }
    }

    return { newClusters, updatedClusters, complaintsProcessed };
  }

  /**
   * Add a complaint to an existing cluster
   */
  private static async addToCluster(
    cluster: IComplaintCluster,
    complaint: {
      _id: mongoose.Types.ObjectId;
      citizenId: mongoose.Types.ObjectId;
    },
  ): Promise<void> {
    cluster.subscriberComplaintIds.push(complaint._id);
    if (!cluster.subscriberCitizenIds.some((id) => id.toString() === complaint.citizenId.toString())) {
      cluster.subscriberCitizenIds.push(complaint.citizenId);
    }
    cluster.complaintCount += 1;
    cluster.lastUpdated = new Date();
    await cluster.save();

    await Complaint.findByIdAndUpdate(complaint._id, {
      clusterId: cluster._id,
      isMasterTicket: false,
    });

    // Update subscriber count on master
    await Complaint.findByIdAndUpdate(cluster.masterComplaintId, {
      subscriberCount: cluster.complaintCount - 1,
    });

    await ComplaintHistory.create({
      complaintId: complaint._id,
      action: HistoryAction.CLUSTERED,
      notes: `Added to existing cluster. Master: ${cluster.masterComplaintId}. Total: ${cluster.complaintCount}.`,
    });
  }

  /**
   * Get cluster details with full complaint data for dashboard display
   */
  static async getClusterDetails(clusterId: string) {
    const cluster = await ComplaintCluster.findById(clusterId)
      .populate('masterComplaintId', 'referenceNumber title status priority assignedOfficer')
      .lean();

    if (!cluster) return null;

    const complaints = await Complaint.find({ clusterId })
      .select('referenceNumber title status priority citizenId createdAt')
      .populate('citizenId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    return { cluster, complaints };
  }

  /**
   * List all active clusters for the CM dashboard
   */
  static async listActiveClusters(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [clusters, total] = await Promise.all([
      ComplaintCluster.find({ status: 'active' })
        .populate('masterComplaintId', 'referenceNumber title status priority assignedOfficer address')
        .sort({ complaintCount: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ComplaintCluster.countDocuments({ status: 'active' }),
    ]);

    return {
      clusters,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Resolve a cluster when the master ticket is resolved
   */
  static async resolveCluster(clusterId: string): Promise<void> {
    await ComplaintCluster.findByIdAndUpdate(clusterId, { status: 'resolved' });
  }
}
