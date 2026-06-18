import { logger } from '../utils/logger';

/**
 * WhatsApp Cloud API provider abstraction.
 * Operates in mock mode when WHATSAPP_ACCESS_TOKEN is not set.
 */

const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || '';
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v18.0';

const isMockMode = !WHATSAPP_ACCESS_TOKEN;

interface SendMessagePayload {
  to: string;
  type: 'text' | 'image' | 'template' | 'interactive';
  text?: { body: string };
  image?: { link: string; caption?: string };
  template?: { name: string; language: { code: string }; components?: unknown[] };
  interactive?: unknown;
}

interface SendMessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface MediaDownloadResult {
  success: boolean;
  buffer?: Buffer;
  mimeType?: string;
  error?: string;
}

export class WhatsAppProvider {
  /**
   * Send a text message to a WhatsApp user
   */
  static async sendTextMessage(to: string, body: string): Promise<SendMessageResponse> {
    return this.sendMessage({
      to,
      type: 'text',
      text: { body },
    });
  }

  /**
   * Send an interactive button message
   */
  static async sendInteractiveButtons(
    to: string,
    body: string,
    buttons: Array<{ id: string; title: string }>,
  ): Promise<SendMessageResponse> {
    return this.sendMessage({
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: body },
        action: {
          buttons: buttons.map((b) => ({
            type: 'reply',
            reply: { id: b.id, title: b.title },
          })),
        },
      },
    });
  }

  /**
   * Send a message via WhatsApp Cloud API (or mock)
   */
  static async sendMessage(payload: SendMessagePayload): Promise<SendMessageResponse> {
    if (isMockMode) {
      const mockId = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      logger.info(`[WhatsApp Mock] → ${payload.to}: ${
        payload.text?.body || payload.type
      } (msgId: ${mockId})`);
      return { success: true, messageId: mockId };
    }

    try {
      const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          Object.assign(
            {
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: payload.to,
              type: payload.type,
            },
            payload.text ? { text: payload.text } : {},
            payload.image ? { image: payload.image } : {},
            payload.template ? { template: payload.template } : {},
            payload.interactive ? { interactive: payload.interactive } : {},
          ),
        ),
      });

      const data = await response.json() as Record<string, unknown>;

      if (!response.ok) {
        logger.error('[WhatsApp API] Send failed:', data);
        return { success: false, error: JSON.stringify(data) };
      }

      const messages = data.messages as Array<{ id: string }> | undefined;
      const messageId = messages?.[0]?.id;
      logger.info(`[WhatsApp API] Sent to ${payload.to}, msgId: ${messageId}`);
      return { success: true, messageId };
    } catch (error) {
      logger.error('[WhatsApp API] Network error:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Download media from WhatsApp Cloud API (or return mock data)
   */
  static async downloadMedia(mediaId: string): Promise<MediaDownloadResult> {
    if (isMockMode) {
      logger.info(`[WhatsApp Mock] Download media: ${mediaId}`);
      return {
        success: true,
        buffer: Buffer.from('mock-image-data'),
        mimeType: 'image/jpeg',
      };
    }

    try {
      // Step 1: Get the media URL
      const metaUrl = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${mediaId}`;
      const metaRes = await fetch(metaUrl, {
        headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` },
      });
      const metaData = await metaRes.json() as { url: string; mime_type: string };

      // Step 2: Download the binary
      const fileRes = await fetch(metaData.url, {
        headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` },
      });
      const buffer = Buffer.from(await fileRes.arrayBuffer());

      return { success: true, buffer, mimeType: metaData.mime_type };
    } catch (error) {
      logger.error('[WhatsApp API] Media download error:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Verify webhook subscription token (Meta verification handshake)
   */
  static verifyWebhook(
    mode: string | undefined,
    token: string | undefined,
    challenge: string | undefined,
  ): { valid: boolean; challenge?: string } {
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'delhi-cm-verify-token';
    if (mode === 'subscribe' && token === verifyToken) {
      return { valid: true, challenge };
    }
    return { valid: false };
  }
}
