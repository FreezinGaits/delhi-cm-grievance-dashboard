import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { WhatsAppService } from '../services/whatsapp.service';
import { WhatsAppProvider } from '../services/whatsapp.provider';
import { WhatsAppMessage, MessageDirection } from '../models/WhatsAppMessage';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /webhooks/whatsapp
 * Meta WhatsApp Cloud API verification handshake.
 * Meta sends a GET request with hub.mode, hub.verify_token, and hub.challenge.
 */
router.get('/', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'] as string | undefined;
  const token = req.query['hub.verify_token'] as string | undefined;
  const challenge = req.query['hub.challenge'] as string | undefined;

  const result = WhatsAppProvider.verifyWebhook(mode, token, challenge);

  if (result.valid) {
    logger.info('[WhatsApp Webhook] Verification successful');
    res.status(200).send(result.challenge);
  } else {
    logger.warn('[WhatsApp Webhook] Verification failed');
    res.status(403).send('Forbidden');
  }
});

/**
 * POST /webhooks/whatsapp
 * Receives incoming WhatsApp messages from Meta Cloud API.
 * Parses the webhook payload and routes to the conversation engine.
 */
router.post('/', async (req: Request, res: Response, _next: NextFunction) => {
  // HMAC Webhook Security Validation
  const signature = req.headers['x-hub-signature-256'] as string;
  const secret = process.env.WHATSAPP_APP_SECRET;

  if (secret && signature) {
    const rawBody = (req as any).rawBody;
    if (rawBody) {
      const hash = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
      const expectedSignature = `sha256=${hash}`;
      
      if (signature !== expectedSignature) {
        logger.warn('[WhatsApp Webhook] Invalid HMAC signature. Possible spoofing attack.');
        return res.status(403).send('Forbidden');
      }
    }
  }

  // Always respond 200 immediately to acknowledge receipt (Meta requires this)
  res.status(200).send('EVENT_RECEIVED');

  try {
    const body = req.body;

    // Validate it's a WhatsApp message notification
    if (body.object !== 'whatsapp_business_account') return;

    const entries = body.entry || [];

    for (const entry of entries) {
      const changes = entry.changes || [];

      for (const change of changes) {
        if (change.field !== 'messages') continue;

        const value = change.value;
        const messages = value?.messages || [];
        const statuses = value?.statuses || [];

        // Process incoming messages
        for (const message of messages) {
          const from = message.from; // Sender's phone number
          const type = message.type; // text, image, location, etc.

          logger.info(`[WhatsApp Webhook] Message from ${from}: type=${type}`);

          // Handle interactive message responses (button/list replies)
          let processedMessage: {
            type: string;
            text?: { body: string };
            location?: { latitude: number; longitude: number; name?: string; address?: string };
            image?: { id: string; mime_type: string };
            id?: string;
          };

          if (type === 'interactive') {
            // Extract the reply from interactive button or list selection
            const interactiveType = message.interactive?.type; // 'button_reply' or 'list_reply'
            const replyId = interactiveType === 'button_reply'
              ? message.interactive?.button_reply?.id
              : message.interactive?.list_reply?.id;
            const replyTitle = interactiveType === 'button_reply'
              ? message.interactive?.button_reply?.title
              : message.interactive?.list_reply?.title;

            logger.info(`[WhatsApp Webhook] Interactive reply: ${interactiveType} → id=${replyId}, title=${replyTitle}`);

            processedMessage = {
              type: 'text',
              text: { body: replyId || replyTitle || '' },
              id: message.id,
            };
          } else {
            processedMessage = {
              type,
              text: message.text,
              location: message.location,
              image: message.image,
              id: message.id,
            };
          }

          await WhatsAppService.processIncomingMessage(from, processedMessage);
        }

        // Process delivery/read status updates
        for (const status of statuses) {
          await WhatsAppMessage.updateOne(
            { waMessageId: status.id },
            {
              $set: {
                deliveryStatus: status.status, // sent, delivered, read, failed
              },
            },
          );
        }
      }
    }
  } catch (error) {
    // Log but don't fail — we already responded 200
    logger.error('[WhatsApp Webhook] Processing error:', error);
  }
});

/**
 * POST /webhooks/whatsapp/test
 * Development-only endpoint to simulate incoming WhatsApp messages.
 * Useful for testing without real WhatsApp Cloud API integration.
 */
router.post('/test', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { from, message } = req.body;

    if (!from || !message) {
      res.status(400).json({
        success: false,
        error: { message: 'Required: from (phone), message (object with type and text/location/image)' },
      });
      return;
    }

    await WhatsAppService.processIncomingMessage(from, message);

    // Fetch the latest messages in this conversation for the response
    const recentMessages = await WhatsAppMessage.find({
      $or: [{ sender: from }, { receiver: from }],
    })
      .sort({ timestamp: -1 })
      .limit(2)
      .lean();

    res.json({
      success: true,
      data: {
        messagesProcessed: 1,
        recentMessages: recentMessages.reverse(),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /webhooks/whatsapp/sessions
 * Admin endpoint to view active WhatsApp sessions.
 */
router.get('/sessions', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { WhatsAppSession } = await import('../models/WhatsAppSession');
    const sessions = await WhatsAppSession.find({ isActive: true })
      .sort({ lastMessageAt: -1 })
      .limit(50)
      .lean();

    res.json({ success: true, data: sessions });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /webhooks/whatsapp/messages/:phone
 * Admin endpoint to view message history for a phone number.
 */
router.get('/messages/:phone', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const phone = req.params.phone;
    const messages = await WhatsAppMessage.find({
      $or: [{ sender: phone }, { receiver: phone }],
    })
      .sort({ timestamp: 1 })
      .limit(100)
      .lean();

    res.json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
});

export default router;
