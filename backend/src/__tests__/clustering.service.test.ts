/**
 * Unit tests for ClusteringService DBSCAN logic.
 */

jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  return { ...actualMongoose, model: jest.fn(), Types: actualMongoose.Types };
});

jest.mock('../models/Complaint', () => ({
  Complaint: {
    find: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
  ComplaintStatus: {
    SUBMITTED: 'submitted',
    UNDER_REVIEW: 'under_review',
    ASSIGNED: 'assigned',
    IN_PROGRESS: 'in_progress',
    RESOLVED: 'resolved',
    CLOSED: 'closed',
    ESCALATED: 'escalated',
  },
}));

jest.mock('../models/ComplaintCluster', () => ({
  ComplaintCluster: {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

jest.mock('../models/ComplaintHistory', () => ({
  ComplaintHistory: { create: jest.fn() },
  HistoryAction: { CLUSTERED: 'clustered' },
}));

jest.mock('../models/AuditLog', () => ({
  AuditLog: { create: jest.fn() },
}));

jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { ClusteringService } from '../services/clustering.service';
import { Complaint } from '../models/Complaint';
import { ComplaintCluster } from '../models/ComplaintCluster';
import mongoose from 'mongoose';

describe('ClusteringService', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  describe('runClustering', () => {
    it('should return zeroes when no unclustered complaints exist', async () => {
      (Complaint.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });

      const result = await ClusteringService.runClustering();
      expect(result.newClusters).toBe(0);
      expect(result.complaintsProcessed).toBe(0);
    });

    it('should group complaints in the same category', async () => {
      const mockComplaints = [
        {
          _id: new mongoose.Types.ObjectId(),
          category: 'Water Supply',
          location: { coordinates: [77.2090, 28.6139] },
          citizenId: new mongoose.Types.ObjectId(),
          priority: 'normal',
          isCritical: false,
        },
        {
          _id: new mongoose.Types.ObjectId(),
          category: 'Water Supply',
          location: { coordinates: [77.2091, 28.6140] },
          citizenId: new mongoose.Types.ObjectId(),
          priority: 'high',
          isCritical: false,
        },
      ];

      // Mock first find for all unclustered complaints
      (Complaint.find as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockComplaints),
        }),
      });

      // Mock findOne for existing cluster check (return null so new cluster forms)
      (ComplaintCluster.findOne as jest.Mock).mockResolvedValue(null);

      // Mock find for neighbors check (returns neighbor)
      (Complaint.find as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([mockComplaints[1]]),
        }),
      });

      (ComplaintCluster.create as jest.Mock).mockResolvedValue({ _id: 'cluster-id' });
      (Complaint.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

      const result = await ClusteringService.runClustering();

      expect(result.newClusters).toBe(1);
      expect(result.complaintsProcessed).toBe(2);
      expect(ComplaintCluster.create).toHaveBeenCalled();
    });
  });

  describe('listActiveClusters', () => {
    it('should paginate correctly', async () => {
      (ComplaintCluster.countDocuments as jest.Mock).mockResolvedValue(50);
      (ComplaintCluster.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      });

      const result = await ClusteringService.listActiveClusters(2, 10);
      expect(result.meta.page).toBe(2);
      expect(result.meta.total).toBe(50);
      expect(result.meta.totalPages).toBe(5);
    });
  });

  describe('getClusterDetails', () => {
    it('should return null for non-existent cluster', async () => {
      (ComplaintCluster.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });

      const result = await ClusteringService.getClusterDetails('nonexistent');
      expect(result).toBeNull();
    });
  });
});
