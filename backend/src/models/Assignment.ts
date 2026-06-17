import mongoose, { Schema, Document } from 'mongoose';

export interface IAssignment extends Document {
  complaintId: mongoose.Types.ObjectId;
  officerId: mongoose.Types.ObjectId;
  departmentId: mongoose.Types.ObjectId;
  assignedBy?: mongoose.Types.ObjectId;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'transferred';
  priority: 'low' | 'normal' | 'high' | 'critical';
  notes?: string;
  acceptedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentSchema = new Schema<IAssignment>(
  {
    complaintId: { type: Schema.Types.ObjectId, ref: 'Complaint', required: true },
    officerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'in_progress', 'completed', 'transferred'],
      default: 'pending',
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'critical'],
      default: 'normal',
    },
    notes: { type: String },
    acceptedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

AssignmentSchema.index({ complaintId: 1 });
AssignmentSchema.index({ officerId: 1, status: 1 });
AssignmentSchema.index({ departmentId: 1, status: 1 });

export const Assignment = mongoose.model<IAssignment>('Assignment', AssignmentSchema);
