import mongoose, { Schema, Document } from 'mongoose';

/**
 * Complaint status lifecycle
 */
export enum ComplaintStatus {
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  PROVISIONALLY_RESOLVED = 'provisionally_resolved',
  RESOLVED = 'resolved',
  REJECTED = 'rejected',
  CLOSED = 'closed',
  ESCALATED = 'escalated',
}

export enum ComplaintPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ComplaintSource {
  WEB = 'web',
  WHATSAPP = 'whatsapp',
  SMS = 'sms',
  HELPLINE = 'helpline',
  SOCIAL_MEDIA = 'social_media',
  WALK_IN = 'walk_in',
}

export interface IComplaint extends Document {
  referenceNumber: string;
  citizenId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  address: {
    street?: string;
    ward?: string;
    zone?: string;
    district?: string;
    pincode?: string;
    landmark?: string;
    fullAddress?: string;
  };
  media: Array<{
    type: 'image' | 'video' | 'audio' | 'document';
    url: string;
    thumbnailUrl?: string;
    mimeType: string;
    size: number;
    metadata?: {
      gpsLat?: number;
      gpsLng?: number;
      timestamp?: Date;
      deviceInfo?: string;
    };
  }>;
  assignedDepartment?: mongoose.Types.ObjectId;
  assignedOfficer?: mongoose.Types.ObjectId;
  sla: {
    deadline?: Date;
    breached: boolean;
    breachedAt?: Date;
  };
  isCritical: boolean;
  criticalReason?: string;
  clusterId?: mongoose.Types.ObjectId;
  isMasterTicket: boolean;
  subscriberCount: number;
  resolutionEvidence?: {
    description?: string;
    media: Array<{
      url: string;
      metadata?: {
        gpsLat?: number;
        gpsLng?: number;
        timestamp?: Date;
      };
    }>;
    resolvedAt?: Date;
    resolvedBy?: mongoose.Types.ObjectId;
  };
  citizenFeedback?: {
    isConfirmed?: boolean;
    respondedAt?: Date;
    rejectionReason?: string;
    rating?: number;
  };
  escalationLevel: number;
  escalationHistory: Array<{
    level: number;
    escalatedTo?: mongoose.Types.ObjectId;
    reason: string;
    escalatedAt: Date;
    escalatedBy?: mongoose.Types.ObjectId;
  }>;
  spotDirective?: {
    directive: string;
    issuedBy: mongoose.Types.ObjectId;
    issuedAt: Date;
    priority: 'immediate' | 'within_24h' | 'within_week';
  };
  source: ComplaintSource;
  tags: string[];
  internalNotes: Array<{
    note: string;
    addedBy: mongoose.Types.ObjectId;
    addedAt: Date;
  }>;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ComplaintSchema = new Schema<IComplaint>(
  {
    referenceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    citizenId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Citizen ID is required'],
    },
    title: {
      type: String,
      required: [true, 'Complaint title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Complaint description is required'],
      trim: true,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    subcategory: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(ComplaintStatus),
      default: ComplaintStatus.SUBMITTED,
      required: true,
    },
    priority: {
      type: String,
      enum: Object.values(ComplaintPriority),
      default: ComplaintPriority.NORMAL,
      required: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true,
      },
      coordinates: {
        type: [Number],
        required: [true, 'Location coordinates are required'],
        validate: {
          validator(coords: number[]) {
            return (
              coords.length === 2 &&
              coords[0] >= -180 && coords[0] <= 180 &&  // longitude
              coords[1] >= -90 && coords[1] <= 90       // latitude
            );
          },
          message: 'Invalid coordinates. Must be [longitude, latitude].',
        },
      },
    },
    address: {
      street: { type: String, trim: true },
      ward: { type: String, trim: true },
      zone: { type: String, trim: true },
      district: { type: String, trim: true },
      pincode: { type: String, trim: true },
      landmark: { type: String, trim: true },
      fullAddress: { type: String, trim: true },
    },
    media: [
      {
        type: {
          type: String,
          enum: ['image', 'video', 'audio', 'document'],
          required: true,
        },
        url: { type: String, required: true },
        thumbnailUrl: { type: String },
        mimeType: { type: String, required: true },
        size: { type: Number, required: true },
        metadata: {
          gpsLat: { type: Number },
          gpsLng: { type: Number },
          timestamp: { type: Date },
          deviceInfo: { type: String },
        },
      },
    ],
    assignedDepartment: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
    },
    assignedOfficer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    sla: {
      deadline: { type: Date },
      breached: { type: Boolean, default: false },
      breachedAt: { type: Date },
    },
    isCritical: {
      type: Boolean,
      default: false,
    },
    criticalReason: {
      type: String,
    },
    clusterId: {
      type: Schema.Types.ObjectId,
      ref: 'ComplaintCluster',
    },
    isMasterTicket: {
      type: Boolean,
      default: false,
    },
    subscriberCount: {
      type: Number,
      default: 0,
    },
    resolutionEvidence: {
      description: { type: String },
      media: [
        {
          url: { type: String },
          metadata: {
            gpsLat: { type: Number },
            gpsLng: { type: Number },
            timestamp: { type: Date },
          },
        },
      ],
      resolvedAt: { type: Date },
      resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    citizenFeedback: {
      isConfirmed: { type: Boolean },
      respondedAt: { type: Date },
      rejectionReason: { type: String },
      rating: { type: Number, min: 1, max: 5 },
    },
    escalationLevel: {
      type: Number,
      default: 0,
    },
    escalationHistory: [
      {
        level: { type: Number, required: true },
        escalatedTo: { type: Schema.Types.ObjectId, ref: 'User' },
        reason: { type: String, required: true },
        escalatedAt: { type: Date, required: true },
        escalatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    spotDirective: {
      directive: { type: String },
      issuedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      issuedAt: { type: Date },
      priority: {
        type: String,
        enum: ['immediate', 'within_24h', 'within_week'],
      },
    },
    source: {
      type: String,
      enum: Object.values(ComplaintSource),
      default: ComplaintSource.WEB,
    },
    tags: [{ type: String, trim: true }],
    internalNotes: [
      {
        note: { type: String, required: true },
        addedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        addedAt: { type: Date, default: Date.now },
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Indexes for performance
ComplaintSchema.index({ referenceNumber: 1 }, { unique: true });
ComplaintSchema.index({ citizenId: 1, status: 1 });
ComplaintSchema.index({ status: 1, priority: 1 });
ComplaintSchema.index({ assignedDepartment: 1, status: 1 });
ComplaintSchema.index({ assignedOfficer: 1, status: 1 });
ComplaintSchema.index({ category: 1, subcategory: 1 });
ComplaintSchema.index({ 'address.ward': 1 });
ComplaintSchema.index({ 'address.district': 1 });
ComplaintSchema.index({ location: '2dsphere' }); // Geospatial index
ComplaintSchema.index({ isCritical: 1 });
ComplaintSchema.index({ 'sla.breached': 1 });
ComplaintSchema.index({ clusterId: 1 });
ComplaintSchema.index({ createdAt: -1 });
ComplaintSchema.index({ isDeleted: 1 });
ComplaintSchema.index({ status: 1, createdAt: -1 });
ComplaintSchema.index({ source: 1 });
// Compound indexes for dashboard queries
ComplaintSchema.index({ assignedDepartment: 1, status: 1, createdAt: -1 });
ComplaintSchema.index({ 'address.district': 1, category: 1, status: 1 });

// Soft delete filter
ComplaintSchema.pre(/^find/, function (this: mongoose.Query<unknown, unknown>, next) {
  const query = this.getFilter();
  if (query.isDeleted === undefined) {
    this.where({ isDeleted: false });
  }
  next();
});

export const Complaint = mongoose.model<IComplaint>('Complaint', ComplaintSchema);
