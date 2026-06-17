# Security Architecture

## Delhi CM Grievance Dashboard

**Version:** 1.0.0  
**Last Updated:** 2026-06-17  

---

## 1. Authentication

### 1.1 JWT Strategy
- **Access Token:** 15-minute expiry, signed with RS256
- **Refresh Token:** 7-day expiry, stored as HTTP-only secure cookie
- **Token Rotation:** Each refresh invalidates the old refresh token
- **Multi-device:** Up to 5 concurrent sessions per user

### 1.2 OTP Authentication (Citizens)
- 6-digit numeric OTP via SMS/WhatsApp
- 5-minute expiry
- Max 3 attempts before lockout (15-minute cooldown)
- Rate limit: 3 OTP requests per phone per hour

### 1.3 Password Policy (Staff)
- Minimum 8 characters
- Must include: uppercase, lowercase, number, special character
- bcrypt hashing with 12 salt rounds
- Password history: last 5 passwords cannot be reused

## 2. Authorization (RBAC)

Role-based access control with middleware enforcement at every route.

### Permission Groups
| Group | Roles |
|-------|-------|
| CITIZEN_ACCESS | citizen |
| OFFICER_ACCESS | officer, department_head |
| MANAGEMENT_ACCESS | department_head, admin, cm |
| ADMIN_ACCESS | admin |
| CM_ACCESS | cm |
| SYSTEM_ACCESS | service roles |

## 3. Data Protection

### 3.1 Encryption
- **At Rest:** MongoDB encrypted storage engine
- **In Transit:** TLS 1.3 for all connections
- **Sensitive Fields:** Phone, email hashed for lookup; PII encrypted with AES-256-GCM
- **API Keys:** Encrypted in database with application-level encryption

### 3.2 Input Validation
- All inputs sanitized against XSS (DOMPurify on frontend, express-validator on backend)
- SQL/NoSQL injection prevention via Mongoose parameterized queries
- File upload validation: type, size, EXIF metadata scanning
- Request body size limits: 10MB for file uploads, 1MB for JSON

## 4. Rate Limiting

| Endpoint Group | Limit | Window |
|----------------|-------|--------|
| Auth (login) | 5 requests | 15 minutes |
| Auth (OTP) | 3 requests | 1 hour |
| Complaint submission | 5 requests | 1 hour |
| General API | 100 requests | 1 minute |
| Dashboard refresh | 30 requests | 1 minute |
| File upload | 10 requests | 1 hour |

## 5. Anti-Fraud Measures

### 5.1 False Closure Prevention
- Officers MUST upload geotagged live photo to resolve
- EXIF GPS must be within 50m of complaint coordinates
- Photo timestamp must be within last 2 hours
- Gallery photos (missing EXIF) are rejected
- All resolution attempts are audit-logged

### 5.2 Duplicate Prevention
- Rate limiting on complaint submission
- Geo-radius duplicate detection (50m same category)
- Phone number verification required

## 6. Audit Logging

Every significant action is logged:
- User authentication events (login, logout, failed attempts)
- Complaint status changes
- Assignment changes
- Evidence uploads
- Admin configuration changes
- Data access by role
- API errors and anomalies

### Audit Log Fields
```
timestamp, userId, action, entity, entityId, 
changes (before/after), ipAddress, userAgent, sessionId
```

## 7. CORS & Headers

```
Content-Security-Policy: default-src 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
Referrer-Policy: strict-origin-when-cross-origin
```

## 8. Secrets Management

- Environment variables via `.env` files (not committed)
- Docker secrets for production
- Key rotation schedule: JWT keys every 90 days
- Third-party API keys stored encrypted in database
