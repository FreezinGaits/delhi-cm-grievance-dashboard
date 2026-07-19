import mongoose, { Schema, Document } from 'mongoose';

/**
 * AIAnalysis — stores the complete AI analysis result for a complaint.
 * One per complaint (updated on re-analysis).
 */

export interface IAIAnalysis extends Document {
  complaintId: mongoose.Types.ObjectId;
  vision?: {
    detectedCategory: string;
    severity: string;
    confidence: number;
    reason: string;
    visibleHazards: string[];
    suggestedTags: string[];
  };
  duplicate?: {
    isDuplicate: boolean;
    masterTicketId?: string;
    reasoning: string;
    candidateCount: number;
  };
  priority?: {
    score: number;
    level: string;
    suggestedSlaHours: number;
    reasoning: string;
  };
  routing?: {
    primaryDepartmentCode: string;
    primaryDepartmentName: string;
    confidence: number;
    reasoning: string;
    secondaryDepartments: string[];
  };
  verification?: {
    verdict: string;
    confidence: number;
    reasoning: string;
    issuesFound: string[];
  };
  overallConfidence: number;
  provider: string;
  isMock: boolean;
  humanOverride?: {
    overriddenBy: mongoose.Types.ObjectId;
    overriddenAt: Date;
    reason: string;
    field: string;
    originalValue: string;
    newValue: string;
  };
  executionTimeMs: number;
  createdAt: Date;
  updatedAt: Date;
}

const AIAnalysisSchema = new Schema<IAIAnalysis>(
  {
    complaintId: {
      type: Schema.Types.ObjectId,
      ref: 'Complaint',
      required: true,
      index: true,
    },
    vision: {
      detectedCategory: String,
      severity: String,
      confidence: Number,
      reason: String,
      visibleHazards: [String],
      suggestedTags: [String],
    },
    duplicate: {
      isDuplicate: Boolean,
      masterTicketId: String,
      reasoning: String,
      candidateCount: Number,
    },
    priority: {
      score: Number,
      level: String,
      suggestedSlaHours: Number,
      reasoning: String,
    },
    routing: {
      primaryDepartmentCode: String,
      primaryDepartmentName: String,
      confidence: Number,
      reasoning: String,
      secondaryDepartments: [String],
    },
    verification: {
      verdict: String,
      confidence: Number,
      reasoning: String,
      issuesFound: [String],
    },
    overallConfidence: { type: Number, default: 0 },
    provider: { type: String, required: true },
    isMock: { type: Boolean, default: true },
    humanOverride: {
      overriddenBy: { type: Schema.Types.ObjectId, ref: 'User' },
      overriddenAt: Date,
      reason: String,
      field: String,
      originalValue: String,
      newValue: String,
    },
    executionTimeMs: { type: Number, default: 0 },
  },
  { timestamps: true },
);

AIAnalysisSchema.index({ complaintId: 1 }, { unique: true });
AIAnalysisSchema.index({ createdAt: -1 });

export const AIAnalysis = mongoose.model<IAIAnalysis>('AIAnalysis', AIAnalysisSchema);
