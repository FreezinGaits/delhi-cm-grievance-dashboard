import mongoose, { Schema, Document } from 'mongoose';

export interface IComplaintCluster extends Document {
  masterComplaintId: mongoose.Types.ObjectId;
  subscriberComplaintIds: mongoose.Types.ObjectId[];
  subscriberCitizenIds: mongoose.Types.ObjectId[];
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  category: string;
  radius: number;
  complaintCount: number;
  status: 'active' | 'resolved' | 'closed';
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ComplaintClusterSchema = new Schema<IComplaintCluster>(
  {
    masterComplaintId: {
      type: Schema.Types.ObjectId,
      ref: 'Complaint',
      required: true,
    },
    subscriberComplaintIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Complaint',
      },
    ],
    subscriberCitizenIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    category: {
      type: String,
      required: true,
    },
    radius: {
      type: Number,
      default: 50, // meters
    },
    complaintCount: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: ['active', 'resolved', 'closed'],
      default: 'active',
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

ComplaintClusterSchema.index({ location: '2dsphere' });
ComplaintClusterSchema.index({ category: 1, status: 1 });
ComplaintClusterSchema.index({ masterComplaintId: 1 });

export const ComplaintCluster = mongoose.model<IComplaintCluster>(
  'ComplaintCluster',
  ComplaintClusterSchema,
);
