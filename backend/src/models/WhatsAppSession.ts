import mongoose, { Schema, Document } from 'mongoose';

/**
 * Conversation states for the WhatsApp grievance intake flow.
 * Each state represents a step in the guided complaint submission.
 */
export enum ConversationState {
  START = 'START',
  AWAITING_NAME = 'AWAITING_NAME',
  AWAITING_LOCATION = 'AWAITING_LOCATION',
  AWAITING_CATEGORY = 'AWAITING_CATEGORY',
  AWAITING_COMPLAINT = 'AWAITING_COMPLAINT',
  AWAITING_IMAGE = 'AWAITING_IMAGE',
  CONFIRMATION = 'CONFIRMATION',
  COMPLETE = 'COMPLETE',
}

export interface IWhatsAppSession extends Document {
  phoneNumber: string;
  citizenId?: mongoose.Types.ObjectId;
  currentConversationState: ConversationState;
  /** Partial complaint data accumulated during the conversation */
  conversationData: {
    name?: string;
    latitude?: number;
    longitude?: number;
    category?: string;
    description?: string;
    mediaUrl?: string;
    ward?: string;
    district?: string;
  };
  lastMessageAt: Date;
  isActive: boolean;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppSessionSchema = new Schema<IWhatsAppSession>(
  {
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      index: true,
      trim: true,
    },
    citizenId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    currentConversationState: {
      type: String,
      enum: Object.values(ConversationState),
      default: ConversationState.START,
      required: true,
    },
    conversationData: {
      name: { type: String },
      latitude: { type: Number },
      longitude: { type: Number },
      category: { type: String },
      description: { type: String },
      mediaUrl: { type: String },
      ward: { type: String },
      district: { type: String },
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    messageCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

WhatsAppSessionSchema.index({ phoneNumber: 1, isActive: 1 });
WhatsAppSessionSchema.index({ lastMessageAt: 1 });
WhatsAppSessionSchema.index({ currentConversationState: 1 });

export const WhatsAppSession = mongoose.model<IWhatsAppSession>(
  'WhatsAppSession',
  WhatsAppSessionSchema,
);
