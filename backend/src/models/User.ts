import mongoose, { Schema, Document } from 'mongoose';

/**
 * User roles in the system
 */
export enum UserRole {
  CITIZEN = 'citizen',
  OFFICER = 'officer',
  DEPARTMENT_HEAD = 'department_head',
  ADMIN = 'admin',
  CM = 'cm',
}

/**
 * Notification channel preferences
 */
export enum NotificationChannel {
  SMS = 'sms',
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
  PUSH = 'push',
}

export interface IUser extends Document {
  name: {
    first: string;
    last: string;
  };
  email: string;
  phone: string;
  role: UserRole;
  departmentId?: mongoose.Types.ObjectId;
  ward?: string;
  passwordHash: string;
  avatar?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  lastLogin?: Date;
  loginAttempts: number;
  lockUntil?: Date;
  otp?: {
    code: string;
    expiresAt: Date;
    attempts: number;
  };
  refreshTokens: Array<{
    token: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }>;
  preferences: {
    language: 'en' | 'hi';
    notificationChannels: NotificationChannel[];
  };
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      first: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        maxlength: [50, 'First name cannot exceed 50 characters'],
      },
      last: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        maxlength: [50, 'Last name cannot exceed 50 characters'],
      },
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
      match: [/^\+91[0-9]{10}$/, 'Please enter a valid Indian phone number (+91XXXXXXXXXX)'],
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.CITIZEN,
      required: true,
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
    },
    ward: {
      type: String,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      select: false, // Never return in queries by default
    },
    avatar: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
    otp: {
      code: { type: String },
      expiresAt: { type: Date },
      attempts: { type: Number, default: 0 },
    },
    refreshTokens: [
      {
        token: { type: String, required: true },
        expiresAt: { type: Date, required: true },
        userAgent: { type: String },
        ipAddress: { type: String },
      },
    ],
    preferences: {
      language: {
        type: String,
        enum: ['en', 'hi'],
        default: 'en',
      },
      notificationChannels: [
        {
          type: String,
          enum: Object.values(NotificationChannel),
        },
      ],
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
        delete ret.passwordHash;
        delete ret.refreshTokens;
        delete ret.otp;
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Indexes
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ phone: 1 }, { unique: true });
UserSchema.index({ role: 1 });
UserSchema.index({ departmentId: 1 });
UserSchema.index({ isActive: 1, role: 1 });
UserSchema.index({ isDeleted: 1 });

// Query middleware to exclude soft-deleted users by default
UserSchema.pre(/^find/, function (this: mongoose.Query<unknown, unknown>, next) {
  const query = this.getFilter();
  if (query.isDeleted === undefined) {
    this.where({ isDeleted: false });
  }
  next();
});

// Virtual for full name
UserSchema.virtual('fullName').get(function () {
  return `${this.name.first} ${this.name.last}`;
});

// Check if account is locked
UserSchema.methods.isLocked = function (): boolean {
  return !!(this.lockUntil && this.lockUntil > new Date());
};

export const User = mongoose.model<IUser>('User', UserSchema);
