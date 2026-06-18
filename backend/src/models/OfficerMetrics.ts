import mongoose, { Schema, Document } from 'mongoose';

export interface IOfficerMetrics extends Document {
  officerId: mongoose.Types.ObjectId;
  period: {
    type: 'daily' | 'weekly' | 'monthly';
    startDate: Date;
    endDate: Date;
  };
  totalAssigned: number;
  totalResolved: number;
  totalEscalated: number;
  avgResolutionTime: number; // in hours
  slaComplianceRate: number; // percentage
  citizenSatisfaction: number; // average rating (1-5)
  currentLoad: number;
  bandwidth: number;
  createdAt: Date;
  updatedAt: Date;
}

const OfficerMetricsSchema = new Schema<IOfficerMetrics>(
  {
    officerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    period: {
      type: { type: String, enum: ['daily', 'weekly', 'monthly'], required: true },
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
    },
    totalAssigned: { type: Number, default: 0 },
    totalResolved: { type: Number, default: 0 },
    totalEscalated: { type: Number, default: 0 },
    avgResolutionTime: { type: Number, default: 0 },
    slaComplianceRate: { type: Number, default: 100 },
    citizenSatisfaction: { type: Number, default: 5 },
    currentLoad: { type: Number, default: 0 },
    bandwidth: { type: Number, default: 10 }, // default bandwidth capacity
  },
  { timestamps: true },
);

OfficerMetricsSchema.index({ officerId: 1, 'period.type': 1, 'period.startDate': -1 });

export const OfficerMetrics = mongoose.model<IOfficerMetrics>(
  'OfficerMetrics',
  OfficerMetricsSchema,
);
