import mongoose, { Schema, Document } from 'mongoose';

/**
 * Message direction within a WhatsApp conversation
 */
export enum MessageDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

/**
 * Types of WhatsApp messages the system handles
 */
export enum WAMessageType {
  TEXT = 'text',
  IMAGE = 'image',
  LOCATION = 'location',
  DOCUMENT = 'document',
  AUDIO = 'audio',
  VIDEO = 'video',
  INTERACTIVE = 'interactive',
  TEMPLATE = 'template',
  REACTION = 'reaction',
}

export interface IWhatsAppMessage extends Document {
  sender: string;
  receiver: string;
  direction: MessageDirection;
  messageType: WAMessageType;
  content: string;
  mediaUrl?: string;
  /** WhatsApp Cloud API message ID for delivery tracking */
  waMessageId?: string;
  /** Associated session for context linking */
  sessionId?: mongoose.Types.ObjectId;
  /** Location data from WhatsApp location messages */
  locationData?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  /** Delivery/read status of outbound messages */
  deliveryStatus?: 'sent' | 'delivered' | 'read' | 'failed';
  metadata?: Record<string, unknown>;
  timestamp: Date;
  createdAt: Date;
}

const WhatsAppMessageSchema = new Schema<IWhatsAppMessage>(
  {
    sender: {
      type: String,
      required: [true, 'Sender is required'],
      trim: true,
    },
    receiver: {
      type: String,
      required: [true, 'Receiver is required'],
      trim: true,
    },
    direction: {
      type: String,
      enum: Object.values(MessageDirection),
      required: true,
    },
    messageType: {
      type: String,
      enum: Object.values(WAMessageType),
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 4096,
    },
    mediaUrl: { type: String },
    waMessageId: { type: String, index: true },
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'WhatsAppSession',
    },
    locationData: {
      latitude: { type: Number },
      longitude: { type: Number },
      name: { type: String },
      address: { type: String },
    },
    deliveryStatus: {
      type: String,
      enum: ['sent', 'delivered', 'read', 'failed'],
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

WhatsAppMessageSchema.index({ sender: 1, timestamp: -1 });
WhatsAppMessageSchema.index({ receiver: 1, timestamp: -1 });
WhatsAppMessageSchema.index({ sessionId: 1, timestamp: 1 });
WhatsAppMessageSchema.index({ direction: 1, timestamp: -1 });
WhatsAppMessageSchema.index({ waMessageId: 1 });

export const WhatsAppMessage = mongoose.model<IWhatsAppMessage>(
  'WhatsAppMessage',
  WhatsAppMessageSchema,
);
