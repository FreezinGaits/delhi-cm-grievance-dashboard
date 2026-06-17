# API Specification

## Delhi CM Grievance Dashboard

**Version:** 1.0.0  
**Base URL:** `http://localhost:5000/api/v1`  
**Last Updated:** 2026-06-17  

---

## 1. Authentication APIs

### POST /auth/register
Register a new citizen user.

**Request Body:**
```json
{
  "firstName": "Rahul",
  "lastName": "Sharma",
  "email": "rahul@example.com",
  "phone": "+919876543210",
  "password": "SecurePass123!",
  "language": "en"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "name": "Rahul Sharma", "role": "citizen" },
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  }
}
```

### POST /auth/login
Login with email/phone and password.

**Request Body:**
```json
{
  "identifier": "rahul@example.com",
  "password": "SecurePass123!"
}
```

### POST /auth/login/otp/request
Request OTP for phone-based login.

**Request Body:**
```json
{
  "phone": "+919876543210"
}
```

### POST /auth/login/otp/verify
Verify OTP and get tokens.

**Request Body:**
```json
{
  "phone": "+919876543210",
  "otp": "123456"
}
```

### POST /auth/refresh
Refresh access token using refresh token.

### POST /auth/logout
Invalidate current refresh token.

### POST /auth/change-password
Change password (authenticated).

---

## 2. Complaint APIs

### POST /complaints
Submit a new complaint.

**Headers:** `Authorization: Bearer <token>`  
**Content-Type:** `multipart/form-data`

**Form Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | Yes | Complaint title |
| description | string | Yes | Detailed description |
| category | string | Yes | Complaint category |
| subcategory | string | No | Sub-category |
| latitude | number | Yes | GPS latitude |
| longitude | number | Yes | GPS longitude |
| address | string | No | Full address text |
| ward | string | No | Ward name/code |
| district | string | No | District name |
| landmark | string | No | Nearby landmark |
| media | File[] | No | Up to 5 images/videos |
| source | string | No | 'web', 'whatsapp', etc. |

**Response (201):**
```json
{
  "success": true,
  "data": {
    "complaint": {
      "id": "...",
      "referenceNumber": "DEL-20260617-00001",
      "status": "submitted",
      "priority": "normal",
      "createdAt": "2026-06-17T12:00:00Z"
    },
    "message": "Complaint registered successfully. Track with reference: DEL-20260617-00001"
  }
}
```

### GET /complaints
List complaints (role-filtered).

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20, max: 100) |
| status | string | Filter by status |
| priority | string | Filter by priority |
| category | string | Filter by category |
| district | string | Filter by district |
| ward | string | Filter by ward |
| dateFrom | ISO date | Start date filter |
| dateTo | ISO date | End date filter |
| search | string | Text search in title/description |
| sortBy | string | Sort field (default: createdAt) |
| sortOrder | string | 'asc' or 'desc' (default: desc) |

### GET /complaints/:id
Get complaint details.

### GET /complaints/track/:referenceNumber
Track complaint by reference number (public).

### PATCH /complaints/:id/status
Update complaint status (officer/admin).

**Request Body:**
```json
{
  "status": "in_progress",
  "notes": "Started investigation at the site"
}
```

### POST /complaints/:id/evidence
Upload resolution evidence (officer).

**Content-Type:** `multipart/form-data`

| Field | Type | Required |
|-------|------|----------|
| description | string | Yes |
| media | File[] | Yes |

### POST /complaints/:id/confirm
Citizen confirms resolution.

**Request Body:**
```json
{
  "isConfirmed": true,
  "rating": 4,
  "comment": "Issue has been fixed properly"
}
```

### POST /complaints/:id/reject
Citizen rejects resolution.

**Request Body:**
```json
{
  "reason": "The pothole is still there, only partially filled"
}
```

### POST /complaints/:id/escalate
Escalate complaint to higher authority.

**Request Body:**
```json
{
  "reason": "No response from assigned officer for 48 hours"
}
```

### GET /complaints/:id/history
Get complete complaint history/timeline.

---

## 3. Department APIs

### GET /departments
List all departments.

### GET /departments/:id
Get department details with stats.

### POST /departments (Admin only)
Create a new department.

### PATCH /departments/:id (Admin only)
Update department details.

### GET /departments/:id/officers
List officers in a department.

### GET /departments/:id/complaints
List complaints for a department.

### GET /departments/:id/metrics
Get department performance metrics.

---

## 4. Officer APIs

### GET /officers/dashboard
Get officer dashboard data (assigned complaints in Kanban format).

**Response:**
```json
{
  "success": true,
  "data": {
    "columns": {
      "new": [{ "complaint": "..." }],
      "assigned": [...],
      "in_progress": [...],
      "resolved": [...],
      "rejected": [...]
    },
    "metrics": {
      "totalAssigned": 42,
      "resolvedToday": 5,
      "slaBreaches": 2,
      "avgResolutionHours": 18.5
    }
  }
}
```

### PATCH /officers/complaints/:id/accept
Accept a complaint assignment.

### PATCH /officers/complaints/:id/transfer
Transfer complaint to another officer/department.

---

## 5. CM Dashboard APIs

### GET /cm/dashboard
Get CM dashboard summary.

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalComplaints": 15420,
      "openComplaints": 3210,
      "resolvedToday": 142,
      "criticalActive": 8,
      "slaBreaches": 45,
      "avgResolutionHours": 36.2,
      "citizenSatisfaction": 78.5
    },
    "departmentPerformance": [...],
    "recentCritical": [...],
    "trendData": [...]
  }
}
```

### GET /cm/heatmap
Get complaint heatmap data.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| category | string | Filter by category |
| status | string | Filter by status |
| dateFrom | ISO date | Start date |
| dateTo | ISO date | End date |
| bounds | string | Map bounds "lat1,lng1,lat2,lng2" |

### GET /cm/nearby-complaints
Get nearby complaints for field visit mode.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| lat | number | Current latitude |
| lng | number | Current longitude |
| radius | number | Radius in meters (500, 1000, 2000) |
| status | string[] | Filter statuses |

### GET /cm/officer-ledger
Get officer resource ledger.

### POST /cm/spot-directive
Issue a spot directive for a complaint.

**Request Body:**
```json
{
  "complaintId": "...",
  "directive": "Fix this pothole within 24 hours",
  "priority": "immediate"
}
```

### GET /cm/alerts
Get critical alerts.

---

## 6. Analytics APIs

### GET /analytics/overview
Overall system analytics.

### GET /analytics/sla-report
SLA compliance report.

### GET /analytics/resolution-rates
Resolution rate trends.

### GET /analytics/department-performance
Department comparison.

### GET /analytics/officer-performance
Officer performance metrics.

### GET /analytics/hotspots
Geographic hotspot analysis.

### GET /analytics/trends
Complaint trend analysis over time.

---

## 7. Admin APIs

### GET /admin/users
List and manage users.

### POST /admin/users
Create staff users (officers, dept heads).

### PATCH /admin/users/:id
Update user details/role.

### DELETE /admin/users/:id
Soft-delete a user.

### GET /admin/audit-logs
View system audit logs.

### GET /admin/routing-rules
Get routing rules configuration.

### PUT /admin/routing-rules
Update routing rules.

### GET /admin/sla-config
Get SLA configurations.

### PUT /admin/sla-config
Update SLA configurations.

---

## 8. Notification APIs

### GET /notifications
Get user notifications.

### PATCH /notifications/:id/read
Mark notification as read.

### PATCH /notifications/read-all
Mark all notifications as read.

---

## 9. Integration APIs (Webhook Endpoints)

### POST /webhooks/whatsapp
WhatsApp incoming message webhook.

### POST /webhooks/sms
SMS incoming message webhook.

### POST /webhooks/external-sync
External department API sync callback.

---

## 10. Common Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid complaint data",
    "details": [
      { "field": "title", "message": "Title is required" }
    ]
  }
}
```

### HTTP Status Codes
| Code | Usage |
|------|-------|
| 200 | Successful GET/PATCH |
| 201 | Successful POST (created) |
| 204 | Successful DELETE |
| 400 | Validation error |
| 401 | Unauthorized |
| 403 | Forbidden (insufficient role) |
| 404 | Resource not found |
| 409 | Conflict (duplicate) |
| 429 | Rate limit exceeded |
| 500 | Internal server error |
