import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'complaint_update' | 'assignment' | 'escalation' | 'alert' | 'confirmation' | 'directive' | 'system';
  channel: 'sms' | 'email' | 'whatsapp' | 'push' | 'in_app';
  title: string;
  body: string;
  metadata?: {
    complaintId?: mongoose.Types.ObjectId;
    referenceNumber?: string;
    actionUrl?: string;
    [key: string]: unknown;
  };
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
  sentAt?: Date;
  readAt?: Date;
  retryCount: number;
  maxRetries: number;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['complaint_update', 'assignment', 'escalation', 'alert', 'confirmation', 'directive', 'system'],
      required: true,
    },
    channel: {
      type: String,
      enum: ['sms', 'email', 'whatsapp', 'push', 'in_app'],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed', 'read'],
      default: 'pending',
    },
    sentAt: { type: Date },
    readAt: { type: Date },
    retryCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 3 },
    error: { type: String },
  },
  { timestamps: true },
);

NotificationSchema.index({ userId: 1, status: 1, createdAt: -1 });
NotificationSchema.index({ status: 1, channel: 1 });
NotificationSchema.index({ createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
