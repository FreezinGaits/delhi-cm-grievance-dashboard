import mongoose, { Schema, Document } from 'mongoose';

/**
 * Performance category tiers
 */
export enum PerformanceCategory {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  NEEDS_ATTENTION = 'needs_attention',
  CRITICAL = 'critical',
}

export interface IOfficerScore extends Document {
  officerId: mongoose.Types.ObjectId;
  departmentId: mongoose.Types.ObjectId;
  /** Period this score covers */
  period: {
    type: 'weekly' | 'monthly' | 'quarterly' | 'all_time';
    startDate: Date;
    endDate: Date;
  };
  /** Individual metric scores (0-100) */
  metrics: {
    resolutionRate: number;
    citizenSatisfaction: number;
    avgResolutionTimeHours: number;
    slaCompliance: number;
    escalationCount: number;
    rejectedResolutions: number;
    criticalCasePerformance: number;
  };
  /** Computed weighted overall score 0-100 */
  overallScore: number;
  /** Performance category derived from overallScore */
  category: PerformanceCategory;
  /** Rank among peers in the same department */
  departmentRank?: number;
  /** Rank among all officers system-wide */
  globalRank?: number;
  /** Total complaints handled in the period */
  totalComplaintsHandled: number;
  /** Score trend vs prior period (-100 to +100) */
  trend: number;
  createdAt: Date;
  updatedAt: Date;
}

const OfficerScoreSchema = new Schema<IOfficerScore>(
  {
    officerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
    },
    period: {
      type: {
        type: String,
        enum: ['weekly', 'monthly', 'quarterly', 'all_time'],
        required: true,
      },
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
    },
    metrics: {
      resolutionRate: { type: Number, default: 0, min: 0, max: 100 },
      citizenSatisfaction: { type: Number, default: 0, min: 0, max: 100 },
      avgResolutionTimeHours: { type: Number, default: 0 },
      slaCompliance: { type: Number, default: 0, min: 0, max: 100 },
      escalationCount: { type: Number, default: 0 },
      rejectedResolutions: { type: Number, default: 0 },
      criticalCasePerformance: { type: Number, default: 0, min: 0, max: 100 },
    },
    overallScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    category: {
      type: String,
      enum: Object.values(PerformanceCategory),
      default: PerformanceCategory.GOOD,
    },
    departmentRank: { type: Number },
    globalRank: { type: Number },
    totalComplaintsHandled: { type: Number, default: 0 },
    trend: { type: Number, default: 0 },
  },
  { timestamps: true },
);

OfficerScoreSchema.index({ officerId: 1, 'period.type': 1, 'period.startDate': -1 });
OfficerScoreSchema.index({ departmentId: 1, overallScore: -1 });
OfficerScoreSchema.index({ overallScore: -1 });
OfficerScoreSchema.index({ category: 1 });

export const OfficerScore = mongoose.model<IOfficerScore>(
  'OfficerScore',
  OfficerScoreSchema,
);
