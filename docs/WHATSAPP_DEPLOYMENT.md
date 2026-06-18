# WhatsApp Integration — Deployment Guide

## Prerequisites

1. **Meta Business Account** — https://business.facebook.com
2. **WhatsApp Business API Access** — Applied through Meta Developer Portal
3. **Publicly accessible HTTPS endpoint** — Required for webhook callbacks

## Step 1: Meta Developer Setup

1. Go to https://developers.facebook.com/apps/
2. Create a new app → Select "Business" type
3. Add "WhatsApp" product to your app
4. Note down:
   - **Phone Number ID** → `WHATSAPP_PHONE_NUMBER_ID`
   - **Access Token** (System User token for production) → `WHATSAPP_ACCESS_TOKEN`

## Step 2: Environment Configuration

```bash
# In your .env file:
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxx
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_VERIFY_TOKEN=delhi-cm-verify-token
WHATSAPP_API_VERSION=v18.0
```

## Step 3: Webhook Registration

### Local Development (with ngrok)

```bash
# Start ngrok tunnel
ngrok http 5000

# Use the HTTPS URL from ngrok output:
# https://abc123.ngrok-free.app/webhooks/whatsapp
```

### Production (Docker / Reverse Proxy)

Ensure your backend is accessible at:
```
https://your-domain.gov.in/webhooks/whatsapp
```

### Register in Meta Developer Portal

1. Go to WhatsApp → Configuration → Webhook
2. **Callback URL**: `https://your-domain/webhooks/whatsapp`
3. **Verify Token**: Same as `WHATSAPP_VERIFY_TOKEN` in your `.env`
4. Subscribe to fields: `messages`

## Step 4: Test the Integration

### Using the built-in test endpoint (no Meta required):

```bash
# Start a conversation
curl -X POST http://localhost:5000/webhooks/whatsapp/test \
  -H "Content-Type: application/json" \
  -d '{"from": "919876543210", "message": {"type": "text", "text": {"body": "Hi"}}}'

# Provide name
curl -X POST http://localhost:5000/webhooks/whatsapp/test \
  -H "Content-Type: application/json" \
  -d '{"from": "919876543210", "message": {"type": "text", "text": {"body": "Ramesh Kumar"}}}'

# Send location
curl -X POST http://localhost:5000/webhooks/whatsapp/test \
  -H "Content-Type: application/json" \
  -d '{"from": "919876543210", "message": {"type": "location", "location": {"latitude": 28.6139, "longitude": 77.2090}}}'

# Select category
curl -X POST http://localhost:5000/webhooks/whatsapp/test \
  -H "Content-Type: application/json" \
  -d '{"from": "919876543210", "message": {"type": "text", "text": {"body": "1"}}}'

# Describe complaint
curl -X POST http://localhost:5000/webhooks/whatsapp/test \
  -H "Content-Type: application/json" \
  -d '{"from": "919876543210", "message": {"type": "text", "text": {"body": "Water pipeline burst near my house. Road flooded for 3 days."}}}'

# Skip image
curl -X POST http://localhost:5000/webhooks/whatsapp/test \
  -H "Content-Type: application/json" \
  -d '{"from": "919876543210", "message": {"type": "text", "text": {"body": "SKIP"}}}'

# Confirm
curl -X POST http://localhost:5000/webhooks/whatsapp/test \
  -H "Content-Type: application/json" \
  -d '{"from": "919876543210", "message": {"type": "text", "text": {"body": "YES"}}}'
```

## Step 5: Docker Deployment

The WhatsApp webhook is integrated into the existing backend container. No separate service required.

```yaml
# docker-compose.yml — no changes needed
# The webhook endpoint is served at /webhooks/whatsapp
```

## Mock Mode

When `WHATSAPP_ACCESS_TOKEN` is empty (default), the system operates in **mock mode**:

- All outbound messages are logged with `[WhatsApp Mock]` prefix
- Media downloads return stub data
- The test endpoint works identically
- No external API calls are made

This allows full development and testing without Meta API access.

## Monitoring

### View active sessions:
```bash
curl http://localhost:5000/webhooks/whatsapp/sessions
```

### View message history:
```bash
curl http://localhost:5000/webhooks/whatsapp/messages/919876543210
```
