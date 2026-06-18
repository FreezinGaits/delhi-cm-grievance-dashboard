import mongoose from 'mongoose';
import { WhatsAppSession, ConversationState, IWhatsAppSession } from '../models/WhatsAppSession';
import { WhatsAppMessage, MessageDirection, WAMessageType } from '../models/WhatsAppMessage';
import { WhatsAppProvider } from './whatsapp.provider';
import { ComplaintService } from './complaint.service';
import { ComplaintSource } from '../models/Complaint';
import { User, UserRole } from '../models/User';
import { AuditLog } from '../models/AuditLog';
import { getRedisClient } from '../config/redis';
import { logger } from '../utils/logger';
import bcrypt from 'bcryptjs';

const COMPLAINT_CATEGORIES = ['Water Supply', 'Roads', 'Sanitation', 'Electricity', 'Law & Order'];

const SESSION_TTL_SECONDS = 3600; // 1 hour session timeout

/**
 * Core WhatsApp Conversation Engine.
 * Manages the full state machine for guided grievance intake.
 */
export class WhatsAppService {
  // ── Session Management ────────────────────────────────────

  /**
   * Retrieve or create a session for a phone number.
   * Session state is cached in Redis for performance.
   */
  static async getOrCreateSession(phoneNumber: string): Promise<IWhatsAppSession> {
    const redisKey = `wa_session:${phoneNumber}`;
    let redis: ReturnType<typeof getRedisClient> | null = null;

    try {
      redis = getRedisClient();
    } catch {
      // Redis unavailable — continue with DB only
    }

    // Try Redis cache first
    if (redis) {
      try {
        const cached = await redis.get(redisKey);
        if (cached) {
          const data = JSON.parse(cached);
          // Verify DB record still exists
          const session = await WhatsAppSession.findById(data._id);
          if (session && session.isActive) {
            return session;
          }
        }
      } catch {
        // Redis read failed — fall through to DB
      }
    }

    // Check DB for active session
    let session = await WhatsAppSession.findOne({ phoneNumber, isActive: true });

    if (!session) {
      session = await WhatsAppSession.create({
        phoneNumber,
        currentConversationState: ConversationState.START,
        lastMessageAt: new Date(),
      });
    }

    // Cache in Redis
    if (redis) {
      try {
        await redis.setex(redisKey, SESSION_TTL_SECONDS, JSON.stringify({
          _id: session._id,
          state: session.currentConversationState,
        }));
      } catch {
        // Redis write failed — non-fatal
      }
    }

    return session;
  }

  /**
   * Update session state in both DB and Redis
   */
  private static async updateSessionState(
    session: IWhatsAppSession,
    newState: ConversationState,
    dataUpdates?: Partial<IWhatsAppSession['conversationData']>,
  ): Promise<void> {
    session.currentConversationState = newState;
    session.lastMessageAt = new Date();
    session.messageCount += 1;

    if (dataUpdates) {
      session.conversationData = {
        ...session.conversationData,
        ...dataUpdates,
      };
    }

    await session.save();

    // Update Redis cache
    try {
      const redis = getRedisClient();
      await redis.setex(
        `wa_session:${session.phoneNumber}`,
        SESSION_TTL_SECONDS,
        JSON.stringify({ _id: session._id, state: newState }),
      );
    } catch {
      // Non-fatal
    }
  }

  /**
   * Close a session after complaint creation or timeout
   */
  private static async closeSession(session: IWhatsAppSession): Promise<void> {
    session.isActive = false;
    session.currentConversationState = ConversationState.COMPLETE;
    await session.save();

    try {
      const redis = getRedisClient();
      await redis.del(`wa_session:${session.phoneNumber}`);
    } catch {
      // Non-fatal
    }
  }

  // ── Message Logging ───────────────────────────────────────

  /**
   * Log an inbound message to the audit trail
   */
  static async logInboundMessage(
    from: string,
    content: string,
    messageType: WAMessageType,
    sessionId: mongoose.Types.ObjectId,
    extras?: {
      waMessageId?: string;
      mediaUrl?: string;
      locationData?: { latitude: number; longitude: number; name?: string; address?: string };
    },
  ): Promise<void> {
    await WhatsAppMessage.create({
      sender: from,
      receiver: 'system',
      direction: MessageDirection.INBOUND,
      messageType,
      content,
      sessionId,
      waMessageId: extras?.waMessageId,
      mediaUrl: extras?.mediaUrl,
      locationData: extras?.locationData,
      timestamp: new Date(),
    });
  }

  /**
   * Log an outbound message to the audit trail
   */
  static async logOutboundMessage(
    to: string,
    content: string,
    sessionId: mongoose.Types.ObjectId,
    waMessageId?: string,
  ): Promise<void> {
    await WhatsAppMessage.create({
      sender: 'system',
      receiver: to,
      direction: MessageDirection.OUTBOUND,
      messageType: WAMessageType.TEXT,
      content,
      sessionId,
      waMessageId,
      deliveryStatus: 'sent',
      timestamp: new Date(),
    });
  }

  // ── Conversation State Machine ────────────────────────────

  /**
   * Process an incoming WhatsApp message through the state machine.
   * This is the main entry point called by the webhook controller.
   */
  static async processIncomingMessage(
    from: string,
    message: {
      type: string;
      text?: { body: string };
      location?: { latitude: number; longitude: number; name?: string; address?: string };
      image?: { id: string; mime_type: string };
      id?: string;
    },
  ): Promise<void> {
    const session = await this.getOrCreateSession(from);

    const textBody = message.text?.body?.trim() || '';
    const upperText = textBody.toUpperCase();

    // Log inbound
    await this.logInboundMessage(
      from,
      textBody || `[${message.type}]`,
      message.type === 'location' ? WAMessageType.LOCATION :
      message.type === 'image' ? WAMessageType.IMAGE : WAMessageType.TEXT,
      session._id as mongoose.Types.ObjectId,
      {
        waMessageId: message.id,
        locationData: message.location,
      },
    );

    // ── Global Commands (available in any state) ────────
    if (upperText === 'HELP') {
      return this.handleHelp(from, session);
    }
    if (upperText === 'STATUS' || upperText === 'MY COMPLAINTS') {
      return this.handleMyComplaints(from, session);
    }
    if (upperText.startsWith('TRACK ')) {
      const ref = textBody.substring(6).trim();
      return this.handleTrack(from, session, ref);
    }
    if (upperText === 'CANCEL') {
      await this.closeSession(session);
      return this.sendAndLog(from, session, '❌ Session cancelled. Send "Hi" to start again.');
    }

    // ── State-specific handlers ─────────────────────────
    switch (session.currentConversationState) {
      case ConversationState.START:
        return this.handleStart(from, session);

      case ConversationState.AWAITING_NAME:
        return this.handleName(from, session, textBody);

      case ConversationState.AWAITING_LOCATION:
        return this.handleLocation(from, session, message);

      case ConversationState.AWAITING_CATEGORY:
        return this.handleCategory(from, session, textBody);

      case ConversationState.AWAITING_COMPLAINT:
        return this.handleComplaint(from, session, textBody);

      case ConversationState.AWAITING_IMAGE:
        return this.handleImage(from, session, message);

      case ConversationState.CONFIRMATION:
        return this.handleConfirmation(from, session, textBody);

      case ConversationState.COMPLETE:
        // Session ended — start a new one
        session.isActive = false;
        await session.save();
        const newSession = await this.getOrCreateSession(from);
        return this.handleStart(from, newSession);

      default:
        return this.handleStart(from, session);
    }
  }

  // ── State Handlers ────────────────────────────────────────

  private static async handleStart(from: string, session: IWhatsAppSession): Promise<void> {
    await this.updateSessionState(session, ConversationState.AWAITING_NAME);
    await this.sendAndLog(from, session,
      `🏛️ *Welcome to the Delhi CM Governance Platform*\n\n` +
      `I'll help you file a grievance directly to the Chief Minister's Office.\n\n` +
      `Please enter your *full name*:\n\n` +
      `_(Type HELP for commands, CANCEL to abort)_`,
    );
  }

  private static async handleName(from: string, session: IWhatsAppSession, name: string): Promise<void> {
    if (!name || name.length < 2) {
      return this.sendAndLog(from, session, '⚠️ Please enter a valid name (at least 2 characters).');
    }

    await this.updateSessionState(session, ConversationState.AWAITING_LOCATION, { name });
    await this.sendAndLog(from, session,
      `Thank you, *${name}*.\n\n` +
      `📍 Please share your *location*.\n\n` +
      `Tap the 📎 attachment icon → Location → Send your current location.\n\n` +
      `This helps us route your complaint to the correct ward office.`,
    );
  }

  private static async handleLocation(
    from: string,
    session: IWhatsAppSession,
    message: { type: string; location?: { latitude: number; longitude: number; name?: string; address?: string }; text?: { body: string } },
  ): Promise<void> {
    if (message.type !== 'location' || !message.location) {
      return this.sendAndLog(from, session,
        '⚠️ Please share a *location pin*, not text.\n\n' +
        'Tap 📎 → Location → Send your current location.',
      );
    }

    const { latitude, longitude } = message.location;
    const ward = this.approximateWard(latitude, longitude);

    await this.updateSessionState(session, ConversationState.AWAITING_CATEGORY, {
      latitude,
      longitude,
      ward,
    });

    const categoryList = COMPLAINT_CATEGORIES.map((c, i) => `${i + 1}. ${c}`).join('\n');
    await this.sendAndLog(from, session,
      `📍 Location received: *${ward}*\n\n` +
      `Please select a *complaint category* by replying with the number:\n\n` +
      `${categoryList}`,
    );
  }

  private static async handleCategory(from: string, session: IWhatsAppSession, text: string): Promise<void> {
    const num = parseInt(text, 10);
    let category: string | undefined;

    if (num >= 1 && num <= COMPLAINT_CATEGORIES.length) {
      category = COMPLAINT_CATEGORIES[num - 1];
    } else {
      // Try text match
      category = COMPLAINT_CATEGORIES.find(
        (c) => c.toLowerCase() === text.toLowerCase(),
      );
    }

    if (!category) {
      const categoryList = COMPLAINT_CATEGORIES.map((c, i) => `${i + 1}. ${c}`).join('\n');
      return this.sendAndLog(from, session,
        `⚠️ Invalid category. Please reply with a number (1-${COMPLAINT_CATEGORIES.length}):\n\n${categoryList}`,
      );
    }

    await this.updateSessionState(session, ConversationState.AWAITING_COMPLAINT, { category });
    await this.sendAndLog(from, session,
      `📂 Category: *${category}*\n\n` +
      `Please *describe your complaint* in detail.\n` +
      `Include what the problem is, how long it has been happening, and any specific details.`,
    );
  }

  private static async handleComplaint(from: string, session: IWhatsAppSession, description: string): Promise<void> {
    if (!description || description.length < 10) {
      return this.sendAndLog(from, session,
        '⚠️ Please provide a more detailed description (at least 10 characters).',
      );
    }

    await this.updateSessionState(session, ConversationState.AWAITING_IMAGE, { description });
    await this.sendAndLog(from, session,
      `📝 Complaint noted.\n\n` +
      `📸 Would you like to attach a *photo* as evidence?\n\n` +
      `Send an image, or type *SKIP* to proceed without one.`,
    );
  }

  private static async handleImage(
    from: string,
    session: IWhatsAppSession,
    message: { type: string; image?: { id: string; mime_type: string }; text?: { body: string } },
  ): Promise<void> {
    const upperText = message.text?.body?.trim().toUpperCase() || '';

    if (message.type === 'image' && message.image) {
      // Download image via WhatsApp API
      const result = await WhatsAppProvider.downloadMedia(message.image.id);
      const mediaUrl = result.success
        ? `whatsapp://media/${message.image.id}`
        : undefined;

      await this.updateSessionState(session, ConversationState.CONFIRMATION, {
        mediaUrl,
      });
    } else if (upperText === 'SKIP' || upperText === 'NO') {
      await this.updateSessionState(session, ConversationState.CONFIRMATION);
    } else {
      return this.sendAndLog(from, session,
        '⚠️ Please send a *photo* or type *SKIP* to continue without one.',
      );
    }

    // Show summary for confirmation
    const data = session.conversationData;
    await this.sendAndLog(from, session,
      `📋 *Complaint Summary*\n\n` +
      `👤 Name: ${data.name}\n` +
      `📍 Ward: ${data.ward || 'Auto-detect'}\n` +
      `📂 Category: ${data.category}\n` +
      `📝 Description: ${data.description}\n` +
      `📸 Photo: ${data.mediaUrl ? 'Yes' : 'No'}\n\n` +
      `Reply *YES* to submit or *NO* to cancel.`,
    );
  }

  private static async handleConfirmation(from: string, session: IWhatsAppSession, text: string): Promise<void> {
    const upper = text.toUpperCase();

    if (upper === 'YES' || upper === 'Y' || upper === 'CONFIRM') {
      try {
        const complaint = await this.createComplaintFromSession(session);
        await this.closeSession(session);

        // Audit log
        await AuditLog.create({
          action: 'WHATSAPP_COMPLAINT_CREATED',
          entity: 'Complaint',
          entityId: complaint._id,
          changes: {
            after: {
              referenceNumber: complaint.referenceNumber,
              source: 'whatsapp',
              phone: from,
            },
          },
        });

        await this.sendAndLog(from, session,
          `✅ *Complaint Registered Successfully!*\n\n` +
          `📌 Reference Number: *${complaint.referenceNumber}*\n\n` +
          `Your complaint has been automatically routed to the responsible department. ` +
          `You will receive status updates here on WhatsApp.\n\n` +
          `To track: Type *TRACK ${complaint.referenceNumber}*\n` +
          `To file another: Type *Hi*`,
        );
      } catch (error) {
        logger.error('[WhatsApp] Complaint creation failed:', error);
        await this.sendAndLog(from, session,
          '❌ Sorry, there was an error submitting your complaint. Please try again.',
        );
      }
    } else if (upper === 'NO' || upper === 'N' || upper === 'CANCEL') {
      await this.closeSession(session);
      await this.sendAndLog(from, session,
        '❌ Complaint cancelled. Send *Hi* to start over.',
      );
    } else {
      await this.sendAndLog(from, session,
        '⚠️ Please reply *YES* to confirm or *NO* to cancel.',
      );
    }
  }

  // ── Global Command Handlers ───────────────────────────────

  private static async handleHelp(from: string, session: IWhatsAppSession): Promise<void> {
    await this.sendAndLog(from, session,
      `🏛️ *Delhi CM Governance Platform — Commands*\n\n` +
      `📝 *Hi* — File a new grievance\n` +
      `📊 *STATUS* — View your complaints\n` +
      `🔍 *TRACK <REF>* — Track a complaint by reference number\n` +
      `📋 *MY COMPLAINTS* — List all your complaints\n` +
      `❓ *HELP* — Show this help message\n` +
      `❌ *CANCEL* — Cancel current operation`,
    );
  }

  private static async handleMyComplaints(from: string, session: IWhatsAppSession): Promise<void> {
    // Find citizen by phone
    const normalizedPhone = from.startsWith('+') ? from : `+${from}`;
    const citizen = await User.findOne({ phone: normalizedPhone, role: UserRole.CITIZEN });

    if (!citizen) {
      return this.sendAndLog(from, session,
        '⚠️ No account found for this phone number. File a complaint first by typing *Hi*.',
      );
    }

    const { Complaint } = await import('../models/Complaint');
    const complaints = await Complaint.find({ citizenId: citizen._id, isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('referenceNumber title status priority createdAt')
      .lean();

    if (complaints.length === 0) {
      return this.sendAndLog(from, session,
        '📋 You have no complaints on file. Type *Hi* to file one.',
      );
    }

    const list = complaints.map((c, i) =>
      `${i + 1}. *${c.referenceNumber}*\n   ${c.title}\n   Status: ${c.status} | Priority: ${c.priority}`,
    ).join('\n\n');

    await this.sendAndLog(from, session,
      `📋 *Your Recent Complaints*\n\n${list}\n\n` +
      `Use *TRACK <reference>* to see details.`,
    );
  }

  private static async handleTrack(from: string, session: IWhatsAppSession, reference: string): Promise<void> {
    try {
      const result = await ComplaintService.trackComplaint(reference);

      const timeline = result.history
        .slice(-5) // Last 5 events
        .map((h) => `• ${h.action}: ${h.notes || ''} (${new Date(h.createdAt).toLocaleDateString()})`)
        .join('\n');

      await this.sendAndLog(from, session,
        `🔍 *Complaint Tracker*\n\n` +
        `📌 Ref: *${result.complaint.referenceNumber}*\n` +
        `📂 ${result.complaint.category}\n` +
        `📊 Status: *${result.complaint.status}*\n` +
        `⚡ Priority: ${result.complaint.priority}\n\n` +
        `📜 *Timeline*\n${timeline}`,
      );
    } catch {
      await this.sendAndLog(from, session,
        `⚠️ Complaint *${reference}* not found. Please check the reference number.`,
      );
    }
  }

  // ── Complaint Creation ────────────────────────────────────

  /**
   * Create a complaint from accumulated session data.
   * Uses the EXACT same ComplaintService.createComplaint method as the web portal.
   */
  private static async createComplaintFromSession(session: IWhatsAppSession) {
    const data = session.conversationData;

    // Find or create citizen user by phone
    let citizen = await User.findOne({ phone: this.normalizePhone(session.phoneNumber) });

    if (!citizen) {
      const names = (data.name || 'WhatsApp User').split(' ');
      const first = names[0] || 'WhatsApp';
      const last = names.slice(1).join(' ') || 'User';
      const passwordHash = await bcrypt.hash(`wa_${Date.now()}`, 10);

      citizen = await User.create({
        name: { first, last },
        email: `wa_${session.phoneNumber.replace(/\D/g, '')}@whatsapp.placeholder`,
        phone: this.normalizePhone(session.phoneNumber),
        role: UserRole.CITIZEN,
        passwordHash,
        isActive: true,
        isPhoneVerified: true,
        preferences: {
          language: 'en',
          notificationChannels: ['whatsapp'],
        },
      });
    }

    // Link citizen to session
    session.citizenId = citizen._id as mongoose.Types.ObjectId;
    await session.save();

    // Create complaint using the shared service
    const complaint = await ComplaintService.createComplaint({
      citizenId: (citizen._id as unknown as string),
      title: `${data.category} issue in ${data.ward || 'Delhi'}`,
      description: data.description || '',
      category: data.category || 'Water Supply',
      latitude: data.latitude || 28.6139,
      longitude: data.longitude || 77.2090,
      address: {
        ward: data.ward,
      },
      media: data.mediaUrl
        ? [{ type: 'image' as const, url: data.mediaUrl, mimeType: 'image/jpeg', size: 0 }]
        : [],
      source: ComplaintSource.WHATSAPP,
    });

    return complaint;
  }

  // ── Utilities ─────────────────────────────────────────────

  /**
   * Send a message and log it to the audit trail
   */
  private static async sendAndLog(
    to: string,
    session: IWhatsAppSession,
    body: string,
  ): Promise<void> {
    const result = await WhatsAppProvider.sendTextMessage(to, body);
    await this.logOutboundMessage(to, body, session._id as mongoose.Types.ObjectId, result.messageId);
  }

  /**
   * Normalize Indian phone to +91XXXXXXXXXX format
   */
  private static normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('91') && digits.length === 12) return `+${digits}`;
    if (digits.length === 10) return `+91${digits}`;
    return `+${digits}`;
  }

  /**
   * Approximate ward from GPS coordinates using Delhi bounding regions.
   * In production, replace with a GeoJSON polygon lookup.
   */
  private static approximateWard(lat: number, lng: number): string {
    const wards: Array<{ name: string; lat: number; lng: number }> = [
      { name: 'Connaught Place', lat: 28.6315, lng: 77.2167 },
      { name: 'Karol Bagh', lat: 28.6514, lng: 77.1907 },
      { name: 'Chandni Chowk', lat: 28.6506, lng: 77.2334 },
      { name: 'Dwarka', lat: 28.5921, lng: 77.0460 },
      { name: 'Rohini', lat: 28.7495, lng: 77.0565 },
      { name: 'Saket', lat: 28.5245, lng: 77.2066 },
      { name: 'Lajpat Nagar', lat: 28.5700, lng: 77.2373 },
      { name: 'Pitampura', lat: 28.7038, lng: 77.1318 },
      { name: 'Janakpuri', lat: 28.6219, lng: 77.0815 },
      { name: 'Vasant Kunj', lat: 28.5194, lng: 77.1540 },
      { name: 'Rajouri Garden', lat: 28.6469, lng: 77.1228 },
      { name: 'Nehru Place', lat: 28.5491, lng: 77.2533 },
    ];

    let closest = wards[0];
    let minDist = Infinity;

    for (const ward of wards) {
      const dist = Math.sqrt(
        Math.pow(lat - ward.lat, 2) + Math.pow(lng - ward.lng, 2),
      );
      if (dist < minDist) {
        minDist = dist;
        closest = ward;
      }
    }

    return closest.name;
  }
}
