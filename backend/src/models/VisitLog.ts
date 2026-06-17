import mongoose, { Schema, Document } from 'mongoose';

export interface IVisitLog extends Document {
  cmUserId: mongoose.Types.ObjectId;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  radius: number;
  complaintsViewed: mongoose.Types.ObjectId[];
  directivesIssued: Array<{
    complaintId: mongoose.Types.ObjectId;
    directive: string;
    priority: string;
  }>;
  startTime: Date;
  endTime?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const VisitLogSchema = new Schema<IVisitLog>(
  {
    cmUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point', required: true },
      coordinates: { type: [Number], required: true },
    },
    radius: { type: Number, required: true },
    complaintsViewed: [{ type: Schema.Types.ObjectId, ref: 'Complaint' }],
    directivesIssued: [
      {
        complaintId: { type: Schema.Types.ObjectId, ref: 'Complaint' },
        directive: { type: String },
        priority: { type: String },
      },
    ],
    startTime: { type: Date, required: true, default: Date.now },
    endTime: { type: Date },
    notes: { type: String },
  },
  { timestamps: true },
);

VisitLogSchema.index({ cmUserId: 1, createdAt: -1 });
VisitLogSchema.index({ location: '2dsphere' });

export const VisitLog = mongoose.model<IVisitLog>('VisitLog', VisitLogSchema);
