import mongoose, { Schema, Document } from 'mongoose';

export enum HistoryAction {
  CREATED = 'created',
  CLASSIFIED = 'classified',
  ASSIGNED = 'assigned',
  REASSIGNED = 'reassigned',
  STATUS_CHANGED = 'status_changed',
  ESCALATED = 'escalated',
  EVIDENCE_ADDED = 'evidence_added',
  NOTE_ADDED = 'note_added',
  CITIZEN_CONFIRMED = 'citizen_confirmed',
  CITIZEN_REJECTED = 'citizen_rejected',
  DIRECTIVE_ISSUED = 'directive_issued',
  CLUSTERED = 'clustered',
  SLA_BREACHED = 'sla_breached',
  PRIORITY_CHANGED = 'priority_changed',
  DEPARTMENT_CHANGED = 'department_changed',
}

export interface IComplaintHistory extends Document {
  complaintId: mongoose.Types.ObjectId;
  action: HistoryAction;
  fromStatus?: string;
  toStatus?: string;
  performedBy?: mongoose.Types.ObjectId;
  notes?: string;
  evidence?: Array<{
    url: string;
    type: string;
  }>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const ComplaintHistorySchema = new Schema<IComplaintHistory>(
  {
    complaintId: {
      type: Schema.Types.ObjectId,
      ref: 'Complaint',
      required: true,
    },
    action: {
      type: String,
      enum: Object.values(HistoryAction),
      required: true,
    },
    fromStatus: { type: String },
    toStatus: { type: String },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: { type: String, maxlength: 1000 },
    evidence: [
      {
        url: { type: String, required: true },
        type: { type: String, required: true },
      },
    ],
    metadata: {
      type: Schema.Types.Mixed,
    },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

ComplaintHistorySchema.index({ complaintId: 1, createdAt: -1 });
ComplaintHistorySchema.index({ performedBy: 1 });
ComplaintHistorySchema.index({ action: 1 });

export const ComplaintHistory = mongoose.model<IComplaintHistory>(
  'ComplaintHistory',
  ComplaintHistorySchema,
);
