/**
 * Unit tests for AccountabilityService scoring logic.
 *
 * These tests validate the weighted scoring algorithm without needing
 * a real MongoDB connection — they test the pure computation logic.
 */

// Mock mongoose and models before importing the service
jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  return {
    ...actualMongoose,
    model: jest.fn(),
    Types: actualMongoose.Types,
  };
});

jest.mock('../models/OfficerScore', () => ({
  OfficerScore: {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
  },
  PerformanceCategory: {
    EXCELLENT: 'excellent',
    GOOD: 'good',
    NEEDS_ATTENTION: 'needs_attention',
    CRITICAL: 'critical',
  },
}));

jest.mock('../models/Complaint', () => ({
  Complaint: {
    find: jest.fn(),
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
  ComplaintPriority: {
    LOW: 'low',
    NORMAL: 'normal',
    HIGH: 'high',
    CRITICAL: 'critical',
  },
}));

jest.mock('../models/User', () => ({
  User: {
    find: jest.fn(),
  },
  UserRole: {
    OFFICER: 'officer',
    DEPARTMENT_HEAD: 'department_head',
  },
}));

jest.mock('../models/AuditLog', () => ({
  AuditLog: { create: jest.fn() },
}));

jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { AccountabilityService } from '../services/accountability.service';
import { OfficerScore } from '../models/OfficerScore';
import { Complaint } from '../models/Complaint';
import { User } from '../models/User';
import mongoose from 'mongoose';

describe('AccountabilityService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPeriodDates', () => {
    it('should return valid weekly period dates', () => {
      // Access private method via prototype
      const result = (AccountabilityService as any).getPeriodDates('weekly');
      expect(result.startDate).toBeInstanceOf(Date);
      expect(result.endDate).toBeInstanceOf(Date);
      expect(result.startDate.getTime()).toBeLessThanOrEqual(result.endDate.getTime());
    });

    it('should return valid monthly period dates', () => {
      const result = (AccountabilityService as any).getPeriodDates('monthly');
      expect(result.startDate.getDate()).toBe(1); // First of the month
    });

    it('should return valid quarterly period dates', () => {
      const result = (AccountabilityService as any).getPeriodDates('quarterly');
      const month = result.startDate.getMonth();
      expect(month % 3).toBe(0); // Quarter start month
    });
  });

  describe('computeOfficerScore', () => {
    const officerId = new mongoose.Types.ObjectId();
    const departmentId = new mongoose.Types.ObjectId();
    const startDate = new Date('2026-06-01');
    const endDate = new Date('2026-06-07');

    it('should return null when officer has no complaints', async () => {
      (Complaint.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });

      const result = await AccountabilityService.computeOfficerScore(
        officerId, departmentId, 'weekly', startDate, endDate,
      );

      expect(result).toBeNull();
    });

    it('should compute a score for an officer with resolved complaints', async () => {
      const mockComplaints = [
        {
          _id: new mongoose.Types.ObjectId(),
          status: 'resolved',
          priority: 'normal',
          sla: { deadline: new Date('2026-06-05'), breached: false },
          citizenFeedback: { rating: 5, isConfirmed: true },
          escalationLevel: 0,
          isCritical: false,
          createdAt: new Date('2026-06-01'),
          updatedAt: new Date('2026-06-02'),
        },
        {
          _id: new mongoose.Types.ObjectId(),
          status: 'resolved',
          priority: 'high',
          sla: { deadline: new Date('2026-06-04'), breached: false },
          citizenFeedback: { rating: 4, isConfirmed: true },
          escalationLevel: 0,
          isCritical: false,
          createdAt: new Date('2026-06-01'),
          updatedAt: new Date('2026-06-03'),
        },
      ];

      (Complaint.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockComplaints),
        }),
      });

      (OfficerScore.findOne as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(null),
          }),
        }),
      });

      (OfficerScore.findOneAndUpdate as jest.Mock).mockResolvedValue({
        _id: 'score-id',
        officerId,
        overallScore: 85,
        category: 'excellent',
        save: jest.fn(),
      });

      const result = await AccountabilityService.computeOfficerScore(
        officerId, departmentId, 'weekly', startDate, endDate,
      );

      expect(result).not.toBeNull();
      expect(OfficerScore.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ officerId }),
        expect.objectContaining({
          officerId,
          departmentId,
          overallScore: expect.any(Number),
          category: expect.stringMatching(/excellent|good|needs_attention|critical/),
          totalComplaintsHandled: 2,
        }),
        { upsert: true, new: true },
      );
    });

    it('should penalize escalations correctly', async () => {
      const mockComplaints = [
        {
          _id: new mongoose.Types.ObjectId(),
          status: 'escalated',
          priority: 'high',
          sla: { deadline: new Date('2026-06-02'), breached: true },
          citizenFeedback: { rating: 1, isConfirmed: false },
          escalationLevel: 2,
          isCritical: false,
          createdAt: new Date('2026-06-01'),
          updatedAt: new Date('2026-06-06'),
        },
      ];

      (Complaint.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockComplaints),
        }),
      });

      (OfficerScore.findOne as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(null),
          }),
        }),
      });

      (OfficerScore.findOneAndUpdate as jest.Mock).mockImplementation((_filter, update) => {
        return Promise.resolve({ ...update, _id: 'score-id', save: jest.fn() });
      });

      const result = await AccountabilityService.computeOfficerScore(
        officerId, departmentId, 'weekly', startDate, endDate,
      );

      expect(result).not.toBeNull();
      // Should have a low score due to: 0% resolution, bad rating, SLA breach, escalation, rejection
      const updateCall = (OfficerScore.findOneAndUpdate as jest.Mock).mock.calls[0][1];
      expect(updateCall.overallScore).toBeLessThan(40);
      expect(updateCall.category).toBe('critical');
    });
  });

  describe('getOfficerRankings', () => {
    it('should query with correct filters', async () => {
      const mockFind = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      });
      (OfficerScore.find as jest.Mock) = mockFind;

      await AccountabilityService.getOfficerRankings('weekly', { sortBy: 'top', limit: 10 });

      expect(mockFind).toHaveBeenCalledWith(
        expect.objectContaining({
          'period.type': 'weekly',
        }),
      );
    });
  });
});
