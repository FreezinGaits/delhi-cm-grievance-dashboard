import mongoose, { Schema, Document } from 'mongoose';

export interface IDepartmentMetrics extends Document {
  departmentId: mongoose.Types.ObjectId;
  period: {
    type: 'daily' | 'weekly' | 'monthly';
    startDate: Date;
    endDate: Date;
  };
  totalComplaints: number;
  resolvedComplaints: number;
  pendingComplaints: number;
  avgResolutionTimeHours: number;
  slaBreaches: number;
  slaComplianceRate: number;
  topCategories: Array<{ category: string; count: number }>;
  hotspots: Array<{ location: { coordinates: [number, number] }; count: number }>;
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentMetricsSchema = new Schema<IDepartmentMetrics>(
  {
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    period: {
      type: { type: String, enum: ['daily', 'weekly', 'monthly'], required: true },
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
    },
    totalComplaints: { type: Number, default: 0 },
    resolvedComplaints: { type: Number, default: 0 },
    pendingComplaints: { type: Number, default: 0 },
    avgResolutionTimeHours: { type: Number, default: 0 },
    slaBreaches: { type: Number, default: 0 },
    slaComplianceRate: { type: Number, default: 100 },
    topCategories: [{ category: String, count: Number }],
    hotspots: [{ location: { coordinates: [Number] }, count: Number }],
  },
  { timestamps: true },
);

DepartmentMetricsSchema.index({ departmentId: 1, 'period.type': 1, 'period.startDate': -1 });

export const DepartmentMetrics = mongoose.model<IDepartmentMetrics>(
  'DepartmentMetrics',
  DepartmentMetricsSchema,
);
