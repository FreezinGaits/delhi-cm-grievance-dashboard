import mongoose, { Schema, Document } from 'mongoose';

/**
 * Directive lifecycle states
 */
export enum DirectiveStatus {
  CREATED = 'created',
  ACKNOWLEDGED = 'acknowledged',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  OVERDUE = 'overdue',
}

export enum DirectivePriority {
  IMMEDIATE = 'immediate',
  WITHIN_24H = 'within_24h',
  WITHIN_WEEK = 'within_week',
}

export interface IDirective extends Document {
  complaintId: mongoose.Types.ObjectId;
  directive: string;
  issuedBy: mongoose.Types.ObjectId;
  assignedOfficer?: mongoose.Types.ObjectId;
  assignedDepartment?: mongoose.Types.ObjectId;
  priority: DirectivePriority;
  status: DirectiveStatus;
  /** Deadline computed from priority */
  deadline: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: mongoose.Types.ObjectId;
  completedAt?: Date;
  completionNotes?: string;
  completionEvidence?: Array<{
    url: string;
    type: string;
  }>;
  statusHistory: Array<{
    status: DirectiveStatus;
    changedBy?: mongoose.Types.ObjectId;
    changedAt: Date;
    notes?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const DirectiveSchema = new Schema<IDirective>(
  {
    complaintId: {
      type: Schema.Types.ObjectId,
      ref: 'Complaint',
      required: true,
    },
    directive: {
      type: String,
      required: [true, 'Directive text is required'],
      maxlength: 2000,
    },
    issuedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedOfficer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    assignedDepartment: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
    },
    priority: {
      type: String,
      enum: Object.values(DirectivePriority),
      default: DirectivePriority.IMMEDIATE,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(DirectiveStatus),
      default: DirectiveStatus.CREATED,
      required: true,
    },
    deadline: {
      type: Date,
      required: true,
    },
    acknowledgedAt: { type: Date },
    acknowledgedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    completedAt: { type: Date },
    completionNotes: { type: String, maxlength: 2000 },
    completionEvidence: [
      {
        url: { type: String, required: true },
        type: { type: String, required: true },
      },
    ],
    statusHistory: [
      {
        status: { type: String, enum: Object.values(DirectiveStatus), required: true },
        changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        changedAt: { type: Date, required: true },
        notes: { type: String },
      },
    ],
  },
  { timestamps: true },
);

DirectiveSchema.index({ complaintId: 1 });
DirectiveSchema.index({ issuedBy: 1, createdAt: -1 });
DirectiveSchema.index({ assignedOfficer: 1, status: 1 });
DirectiveSchema.index({ assignedDepartment: 1, status: 1 });
DirectiveSchema.index({ status: 1, deadline: 1 });
DirectiveSchema.index({ createdAt: -1 });

export const Directive = mongoose.model<IDirective>('Directive', DirectiveSchema);
