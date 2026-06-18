# WhatsApp Webhook API Reference

## Webhook Endpoints

### `GET /webhooks/whatsapp`
**Meta Verification Handshake**

Called by Meta when subscribing to webhook events.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| hub.mode | string | Must be "subscribe" |
| hub.verify_token | string | Must match `WHATSAPP_VERIFY_TOKEN` env var |
| hub.challenge | string | Challenge string to echo back |

**Response:** `200 OK` with the challenge string, or `403 Forbidden`.

---

### `POST /webhooks/whatsapp`
**Incoming Message Handler**

Receives all WhatsApp Cloud API webhook events (messages, status updates).

**Request Body (Meta Format):**
```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "BUSINESS_ACCOUNT_ID",
    "changes": [{
      "field": "messages",
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {
          "display_phone_number": "PHONE_NUMBER",
          "phone_number_id": "PHONE_NUMBER_ID"
        },
        "messages": [{
          "from": "919876543210",
          "id": "wamid.xxxxx",
          "type": "text",
          "text": { "body": "Hi" },
          "timestamp": "1234567890"
        }]
      }
    }]
  }]
}
```

**Response:** `200 OK` (always — Meta requires immediate acknowledgment).

---

### `POST /webhooks/whatsapp/test`
**Development Test Endpoint**

Simulate a WhatsApp message without Meta infrastructure.

**Request Body:**
```json
{
  "from": "919876543210",
  "message": {
    "type": "text",
    "text": { "body": "Hi" }
  }
}
```

**Location message:**
```json
{
  "from": "919876543210",
  "message": {
    "type": "location",
    "location": {
      "latitude": 28.6139,
      "longitude": 77.2090
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "messagesProcessed": 1,
    "recentMessages": [...]
  }
}
```

---

### `GET /webhooks/whatsapp/sessions`
**List Active Sessions**

Returns all currently active WhatsApp conversation sessions.

**Response:**
```json
{
  "success": true,
  "data": [{
    "_id": "...",
    "phoneNumber": "919876543210",
    "currentConversationState": "AWAITING_COMPLAINT",
    "conversationData": { "name": "Ramesh Kumar", ... },
    "lastMessageAt": "2026-06-18T10:00:00.000Z",
    "isActive": true,
    "messageCount": 4
  }]
}
```

---

### `GET /webhooks/whatsapp/messages/:phone`
**Message History for a Phone Number**

Returns chronological message log for auditing.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| phone | string | Phone number (path param) |

**Response:**
```json
{
  "success": true,
  "data": [{
    "sender": "919876543210",
    "receiver": "system",
    "direction": "inbound",
    "messageType": "text",
    "content": "Hi",
    "timestamp": "2026-06-18T10:00:00.000Z"
  }]
}
```

## Example Conversation Flow

```
Citizen → Hi
Bot     ← Welcome to Delhi CM Governance Platform. Please enter your full name.
Citizen → Ramesh Kumar
Bot     ← Thank you, Ramesh Kumar. Please share your location.
Citizen → [Location Pin: 28.6139, 77.2090]
Bot     ← Location received: Connaught Place. Select complaint category: 1. Water Supply ...
Citizen → 1
Bot     ← Category: Water Supply. Please describe your complaint in detail.
Citizen → Water pipeline burst near my house for 3 days. Road is flooded.
Bot     ← Would you like to attach a photo? Send an image or type SKIP.
Citizen → SKIP
Bot     ← Complaint Summary: ... Reply YES to submit or NO to cancel.
Citizen → YES
Bot     ← ✅ Complaint Registered! Reference: DEL-20260618-00001. Track: TRACK DEL-20260618-00001
```
