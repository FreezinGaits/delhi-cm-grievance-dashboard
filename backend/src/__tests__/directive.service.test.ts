/**
 * Unit tests for DirectiveService lifecycle logic.
 */

jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  return { ...actualMongoose, model: jest.fn(), Types: actualMongoose.Types };
});

jest.mock('../models/Directive', () => {
  const DirectiveStatus = {
    CREATED: 'created',
    ACKNOWLEDGED: 'acknowledged',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    OVERDUE: 'overdue',
  };
  const DirectivePriority = {
    IMMEDIATE: 'immediate',
    WITHIN_24H: 'within_24h',
    WITHIN_WEEK: 'within_week',
  };
  return {
    Directive: {
      create: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn(),
      updateMany: jest.fn(),
    },
    DirectiveStatus,
    DirectivePriority,
  };
});

jest.mock('../models/Complaint', () => ({
  Complaint: { findById: jest.fn() },
  ComplaintPriority: { CRITICAL: 'critical' },
}));

jest.mock('../models/ComplaintHistory', () => ({
  ComplaintHistory: { create: jest.fn() },
  HistoryAction: { DIRECTIVE_ISSUED: 'directive_issued', STATUS_CHANGED: 'status_changed' },
}));

jest.mock('../models/AuditLog', () => ({
  AuditLog: { create: jest.fn() },
}));

jest.mock('../middleware/error.middleware', () => ({
  ApiError: {
    notFound: (msg: string) => Object.assign(new Error(msg), { statusCode: 404 }),
    badRequest: (msg: string) => Object.assign(new Error(msg), { statusCode: 400 }),
    unauthorized: () => Object.assign(new Error('Unauthorized'), { statusCode: 401 }),
  },
}));

jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { DirectiveService } from '../services/directive.service';
import { Directive, DirectiveStatus } from '../models/Directive';
import { Complaint } from '../models/Complaint';
import mongoose from 'mongoose';

describe('DirectiveService', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  describe('issueDirective', () => {
    it('should throw when complaint not found', async () => {
      (Complaint.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(
        DirectiveService.issueDirective('nonexistent', 'Fix this', 'immediate' as any, 'cm-user-id'),
      ).rejects.toThrow('Complaint not found');
    });

    it('should create a directive and elevate complaint priority', async () => {
      const complaintId = new mongoose.Types.ObjectId();
      const cmUserId = new mongoose.Types.ObjectId().toString();
      const mockComplaint = {
        _id: complaintId,
        referenceNumber: 'DEL-001',
        priority: 'normal',
        assignedOfficer: new mongoose.Types.ObjectId(),
        assignedDepartment: new mongoose.Types.ObjectId(),
        save: jest.fn(),
      };

      (Complaint.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockComplaint),
        }),
      });

      const mockDirective = {
        _id: new mongoose.Types.ObjectId(),
        complaintId,
        directive: 'Fix immediately',
        priority: 'immediate',
        status: 'created',
      };

      (Directive.create as jest.Mock).mockResolvedValue(mockDirective);

      const result = await DirectiveService.issueDirective(
        complaintId.toString(), 'Fix immediately', 'immediate' as any, cmUserId,
      );

      expect(result).toEqual(mockDirective);
      expect(mockComplaint.save).toHaveBeenCalled();
      expect(mockComplaint.priority).toBe('critical'); // elevated
    });
  });

  describe('acknowledgeDirective', () => {
    it('should reject if directive not found', async () => {
      (Directive.findById as jest.Mock).mockResolvedValue(null);
      await expect(
        DirectiveService.acknowledgeDirective('bad-id', 'officer-id'),
      ).rejects.toThrow('Directive not found');
    });

    it('should reject if directive is not in created state', async () => {
      (Directive.findById as jest.Mock).mockResolvedValue({
        _id: 'id', status: 'completed', statusHistory: [],
      });
      await expect(
        DirectiveService.acknowledgeDirective('id', 'officer-id'),
      ).rejects.toThrow(/Cannot acknowledge/);
    });

    it('should acknowledge a created directive', async () => {
      const mockDirective = {
        _id: new mongoose.Types.ObjectId(),
        status: 'created',
        statusHistory: [],
        save: jest.fn().mockResolvedValue(true),
      };
      (Directive.findById as jest.Mock).mockResolvedValue(mockDirective);

      const officerId = new mongoose.Types.ObjectId().toString();

      const result = await DirectiveService.acknowledgeDirective(
        mockDirective._id.toString(), officerId,
      );

      expect(result.status).toBe('acknowledged');
      expect(result.acknowledgedAt).toBeInstanceOf(Date);
      expect(mockDirective.save).toHaveBeenCalled();
    });
  });

  describe('checkOverdueDirectives', () => {
    it('should mark overdue directives', async () => {
      (Directive.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 3 });
      const count = await DirectiveService.checkOverdueDirectives();
      expect(count).toBe(3);
      expect(Directive.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          status: { $in: ['created', 'acknowledged', 'in_progress'] },
          deadline: { $lt: expect.any(Date) },
        }),
        expect.any(Object),
      );
    });
  });

  describe('getDashboardStats', () => {
    it('should return all counts', async () => {
      (Directive.countDocuments as jest.Mock)
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(20)  // created
        .mockResolvedValueOnce(15)  // acknowledged
        .mockResolvedValueOnce(30)  // inProgress
        .mockResolvedValueOnce(25)  // completed
        .mockResolvedValueOnce(10); // overdue

      const stats = await DirectiveService.getDashboardStats();
      expect(stats).toEqual({
        total: 100, created: 20, acknowledged: 15,
        inProgress: 30, completed: 25, overdue: 10,
      });
    });
  });
});
