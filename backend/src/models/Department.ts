import mongoose, { Schema, Document } from 'mongoose';

export interface IRoutingRule {
  category: string;
  subcategory?: string;
  keywords: string[];
  priority: 'low' | 'normal' | 'high' | 'critical';
  autoAssign: boolean;
}

export interface IDepartment extends Document {
  name: string;
  code: string;
  description: string;
  headOfficer?: mongoose.Types.ObjectId;
  categories: string[];
  contactEmail: string;
  contactPhone: string;
  address?: string;
  jurisdiction: {
    wards: string[];
    zones: string[];
    districts: string[];
  };
  slaDefaults: {
    normal: number;
    high: number;
    critical: number;
  };
  routingRules: IRoutingRule[];
  externalApi?: {
    endpoint: string;
    apiKey: string;
    isAvailable: boolean;
    lastChecked?: Date;
  };
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentSchema = new Schema<IDepartment>(
  {
    name: {
      type: String,
      required: [true, 'Department name is required'],
      trim: true,
      maxlength: [100, 'Department name cannot exceed 100 characters'],
    },
    code: {
      type: String,
      required: [true, 'Department code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [20, 'Department code cannot exceed 20 characters'],
    },
    description: {
      type: String,
      required: [true, 'Department description is required'],
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    headOfficer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    categories: [
      {
        type: String,
        trim: true,
      },
    ],
    contactEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    contactPhone: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    jurisdiction: {
      wards: [{ type: String, trim: true }],
      zones: [{ type: String, trim: true }],
      districts: [{ type: String, trim: true }],
    },
    slaDefaults: {
      normal: { type: Number, default: 72 },   // 72 hours
      high: { type: Number, default: 24 },     // 24 hours
      critical: { type: Number, default: 4 },  // 4 hours
    },
    routingRules: [
      {
        category: { type: String, required: true },
        subcategory: { type: String },
        keywords: [{ type: String }],
        priority: {
          type: String,
          enum: ['low', 'normal', 'high', 'critical'],
          default: 'normal',
        },
        autoAssign: { type: Boolean, default: true },
      },
    ],
    externalApi: {
      endpoint: { type: String },
      apiKey: { type: String },
      isAvailable: { type: Boolean, default: false },
      lastChecked: { type: Date },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
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
        if (ret.externalApi) {
          delete ret.externalApi.apiKey; // Never expose API keys
        }
        return ret;
      },
    },
  },
);

// Indexes
DepartmentSchema.index({ categories: 1 });
DepartmentSchema.index({ isActive: 1 });
DepartmentSchema.index({ isDeleted: 1 });

// Soft delete filter
DepartmentSchema.pre(/^find/, function (this: mongoose.Query<unknown, unknown>, next) {
  const query = this.getFilter();
  if (query.isDeleted === undefined) {
    this.where({ isDeleted: false });
  }
  next();
});

export const Department = mongoose.model<IDepartment>('Department', DepartmentSchema);
