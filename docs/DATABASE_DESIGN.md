# Database Design

## Delhi CM Grievance Dashboard

**Version:** 1.0.0  
**Last Updated:** 2026-06-17  

---

## 1. ER Diagram

```
┌──────────────┐       ┌──────────────────┐       ┌─────────────────┐
│   Users      │       │   Departments    │       │  Assignments    │
│──────────────│       │──────────────────│       │─────────────────│
│ _id          │       │ _id              │       │ _id             │
│ name         │◄──────│ headOfficer      │       │ complaintId  ──►├──┐
│ email        │       │ name             │       │ officerId    ──►│  │
│ phone        │       │ code             │       │ departmentId ──►│  │
│ role         │       │ description      │       │ assignedBy   ──►│  │
│ department──►│──────►│ categories[]     │       │ status          │  │
│ passwordHash │       │ contactEmail     │       │ priority        │  │
│ isActive     │       │ contactPhone     │       │ notes           │  │
│ lastLogin    │       │ slaDefaults{}    │       │ timestamps      │  │
│ otp{}        │       │ isActive         │       └─────────────────┘  │
│ refreshTokens│       │ routingRules[]   │                            │
│ timestamps   │       │ timestamps       │                            │
└──────┬───────┘       └──────────────────┘                            │
       │                                                               │
       │           ┌───────────────────────┐                           │
       │           │    Complaints         │◄──────────────────────────┘
       │           │───────────────────────│
       │           │ _id                   │
       └──────────►│ citizenId             │
                   │ referenceNumber       │
                   │ title                 │
                   │ description           │
                   │ category              │
                   │ subcategory           │
                   │ status                │
                   │ priority              │
                   │ location{}            │───── GeoJSON Point
                   │ address{}             │      (2dsphere index)
                   │ media[]               │
                   │ assignedDepartment ──►│──► Departments
                   │ assignedOfficer   ──►│──► Users
                   │ slaDeadline           │
                   │ isCritical            │
                   │ clusterId          ──►│──► ComplaintClusters
                   │ resolutionEvidence{}  │
                   │ citizenFeedback{}     │
                   │ escalationLevel       │
                   │ tags[]                │
                   │ isDeleted (soft)      │
                   │ timestamps            │
                   └───────┬───────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
┌──────────────────┐ ┌──────────┐ ┌──────────────────┐
│ComplaintHistory   │ │AuditLogs │ │ComplaintClusters  │
│──────────────────│ │──────────│ │──────────────────│
│ _id              │ │ _id      │ │ _id              │
│ complaintId      │ │ action   │ │ masterComplaint  │
│ action           │ │ entity   │ │ subscriberIds[]  │
│ fromStatus       │ │ entityId │ │ location{}       │
│ toStatus         │ │ userId   │ │ category         │
│ performedBy      │ │ changes{}│ │ radius           │
│ notes            │ │ ipAddress│ │ complaintCount   │
│ evidence[]       │ │ userAgent│ │ status           │
│ metadata{}       │ │ timestamp│ │ timestamps       │
│ timestamp        │ └──────────┘ └──────────────────┘
└──────────────────┘

┌──────────────────┐ ┌──────────────────┐ ┌─────────────────────┐
│  Notifications   │ │  VisitLogs       │ │  OfficerMetrics     │
│──────────────────│ │──────────────────│ │─────────────────────│
│ _id              │ │ _id              │ │ _id                 │
│ userId           │ │ cmUserId         │ │ officerId           │
│ type (sms/email/ │ │ location{}       │ │ period              │
│  whatsapp/push)  │ │ radius           │ │ totalAssigned       │
│ channel          │ │ complaintsViewed │ │ totalResolved       │
│ title            │ │ directivesIssued │ │ totalEscalated      │
│ body             │ │ startTime        │ │ avgResolutionTime   │
│ metadata{}       │ │ endTime          │ │ slaComplianceRate   │
│ status           │ │ notes            │ │ citizenSatisfaction │
│ sentAt           │ │ timestamps       │ │ currentLoad         │
│ readAt           │ └──────────────────┘ │ bandwidth           │
│ retryCount       │                      │ timestamps          │
│ timestamps       │                      └─────────────────────┘
└──────────────────┘
                     ┌─────────────────────┐
                     │ DepartmentMetrics   │
                     │─────────────────────│
                     │ _id                 │
                     │ departmentId        │
                     │ period              │
                     │ totalComplaints     │
                     │ resolvedComplaints  │
                     │ pendingComplaints   │
                     │ avgResolutionTime   │
                     │ slaBreaches         │
                     │ slaComplianceRate   │
                     │ topCategories[]     │
                     │ hotspots[]          │
                     │ timestamps          │
                     └─────────────────────┘
```

---

## 2. Schema Details

### 2.1 Users Collection

```typescript
{
  name: { first: string, last: string },
  email: string,           // unique, indexed
  phone: string,           // unique, indexed (E.164 format)
  role: enum ['citizen', 'officer', 'department_head', 'admin', 'cm'],
  departmentId: ObjectId,  // ref: Departments (for officers/dept_heads)
  ward: string,            // assigned ward (for officers)
  passwordHash: string,
  avatar: string,          // MinIO URL
  isActive: boolean,       // default: true
  isEmailVerified: boolean,
  isPhoneVerified: boolean,
  lastLogin: Date,
  loginAttempts: number,   // for brute force protection
  lockUntil: Date,         // account lockout
  otp: {
    code: string,          // hashed OTP
    expiresAt: Date,
    attempts: number
  },
  refreshTokens: [{
    token: string,         // hashed
    expiresAt: Date,
    userAgent: string,
    ipAddress: string
  }],
  preferences: {
    language: enum ['en', 'hi'],
    notificationChannels: [enum ['sms', 'email', 'whatsapp', 'push']]
  },
  isDeleted: boolean,      // soft delete
  deletedAt: Date,
  createdAt: Date,
  updatedAt: Date
}

// Indexes
{ email: 1 }              // unique
{ phone: 1 }              // unique
{ role: 1 }
{ departmentId: 1 }
{ isActive: 1, role: 1 }
{ isDeleted: 1 }
```

### 2.2 Departments Collection

```typescript
{
  name: string,            // "Municipal Corporation of Delhi"
  code: string,            // "MCD" - unique, indexed
  description: string,
  headOfficer: ObjectId,   // ref: Users
  categories: [string],    // complaint categories this dept handles
  contactEmail: string,
  contactPhone: string,
  address: string,
  jurisdiction: {
    wards: [string],       // ward codes
    zones: [string],       // zone names
    districts: [string]    // district names
  },
  slaDefaults: {
    normal: number,        // hours (e.g., 72)
    high: number,          // hours (e.g., 24)
    critical: number       // hours (e.g., 4)
  },
  routingRules: [{
    category: string,
    subcategory: string,
    keywords: [string],
    priority: enum ['low', 'normal', 'high', 'critical'],
    autoAssign: boolean
  }],
  externalApi: {
    endpoint: string,      // external department API URL
    apiKey: string,        // encrypted
    isAvailable: boolean,  // fallback flag
    lastChecked: Date
  },
  isActive: boolean,
  isDeleted: boolean,
  deletedAt: Date,
  createdAt: Date,
  updatedAt: Date
}

// Indexes
{ code: 1 }               // unique
{ 'categories': 1 }
{ isActive: 1 }
```

### 2.3 Complaints Collection

```typescript
{
  referenceNumber: string,  // "DEL-20260617-00001" unique, indexed
  citizenId: ObjectId,      // ref: Users
  title: string,
  description: string,
  category: string,         // indexed
  subcategory: string,
  
  status: enum [
    'submitted',            // initial state
    'under_review',         // being classified
    'assigned',             // assigned to officer
    'in_progress',          // officer working on it
    'provisionally_resolved', // officer says done, citizen pending
    'resolved',             // citizen confirmed
    'rejected',             // citizen rejected, reopened
    'closed',               // fully closed
    'escalated'             // escalated to higher authority
  ],
  
  priority: enum ['low', 'normal', 'high', 'critical'],
  
  location: {
    type: 'Point',
    coordinates: [number, number]  // [longitude, latitude]
  },
  
  address: {
    street: string,
    ward: string,           // indexed
    zone: string,
    district: string,       // indexed
    pincode: string,
    landmark: string,
    fullAddress: string
  },
  
  media: [{
    type: enum ['image', 'video', 'audio', 'document'],
    url: string,            // MinIO URL
    thumbnailUrl: string,
    mimeType: string,
    size: number,           // bytes
    metadata: {
      gpsLat: number,
      gpsLng: number,
      timestamp: Date,
      deviceInfo: string
    }
  }],
  
  assignedDepartment: ObjectId,  // ref: Departments
  assignedOfficer: ObjectId,     // ref: Users
  
  sla: {
    deadline: Date,
    breached: boolean,       // indexed
    breachedAt: Date
  },
  
  isCritical: boolean,      // indexed
  criticalReason: string,
  
  clusterId: ObjectId,      // ref: ComplaintClusters
  isMasterTicket: boolean,
  subscriberCount: number,  // for master tickets
  
  resolutionEvidence: {
    description: string,
    media: [{
      url: string,
      metadata: {
        gpsLat: number,
        gpsLng: number,
        timestamp: Date
      }
    }],
    resolvedAt: Date,
    resolvedBy: ObjectId     // ref: Users
  },
  
  citizenFeedback: {
    isConfirmed: boolean,    // null = pending
    respondedAt: Date,
    rejectionReason: string,
    rating: number           // 1-5
  },
  
  escalationLevel: number,  // 0 = none, 1, 2, 3...
  escalationHistory: [{
    level: number,
    escalatedTo: ObjectId,
    reason: string,
    escalatedAt: Date,
    escalatedBy: ObjectId
  }],
  
  spotDirective: {
    directive: string,
    issuedBy: ObjectId,      // CM user
    issuedAt: Date,
    priority: enum ['immediate', 'within_24h', 'within_week']
  },
  
  source: enum ['web', 'whatsapp', 'sms', 'helpline', 'social_media', 'walk_in'],
  
  tags: [string],
  internalNotes: [{
    note: string,
    addedBy: ObjectId,
    addedAt: Date
  }],
  
  isDeleted: boolean,
  deletedAt: Date,
  createdAt: Date,
  updatedAt: Date
}

// Indexes
{ referenceNumber: 1 }                    // unique
{ citizenId: 1, status: 1 }
{ status: 1, priority: 1 }
{ assignedDepartment: 1, status: 1 }
{ assignedOfficer: 1, status: 1 }
{ category: 1, subcategory: 1 }
{ 'address.ward': 1 }
{ 'address.district': 1 }
{ location: '2dsphere' }                  // geospatial
{ isCritical: 1 }
{ 'sla.breached': 1 }
{ clusterId: 1 }
{ createdAt: -1 }
{ isDeleted: 1 }
{ status: 1, createdAt: -1 }
{ source: 1 }
```

### 2.4 ComplaintHistory Collection

```typescript
{
  complaintId: ObjectId,     // ref: Complaints, indexed
  action: enum [
    'created', 'classified', 'assigned', 'reassigned',
    'status_changed', 'escalated', 'evidence_added',
    'note_added', 'citizen_confirmed', 'citizen_rejected',
    'directive_issued', 'clustered', 'sla_breached',
    'priority_changed', 'department_changed'
  ],
  fromStatus: string,
  toStatus: string,
  performedBy: ObjectId,     // ref: Users
  notes: string,
  evidence: [{
    url: string,
    type: string
  }],
  metadata: Mixed,           // flexible additional data
  ipAddress: string,
  userAgent: string,
  createdAt: Date
}

// Indexes
{ complaintId: 1, createdAt: -1 }
{ performedBy: 1 }
{ action: 1 }
```

### 2.5 ComplaintClusters Collection

```typescript
{
  masterComplaintId: ObjectId,  // ref: Complaints
  subscriberComplaintIds: [ObjectId],
  subscriberCitizenIds: [ObjectId],
  location: {
    type: 'Point',
    coordinates: [number, number]
  },
  category: string,
  radius: number,              // meters
  complaintCount: number,
  status: enum ['active', 'resolved', 'closed'],
  lastUpdated: Date,
  createdAt: Date,
  updatedAt: Date
}

// Indexes
{ location: '2dsphere' }
{ category: 1, status: 1 }
{ masterComplaintId: 1 }
```

### 2.6 Remaining Collections

**VisitLogs**, **AuditLogs**, **Notifications**, **Assignments**, **OfficerMetrics**, **DepartmentMetrics** follow similar patterns as detailed in the ER diagram above.

---

## 3. Indexing Strategy

### Performance Indexes
| Collection | Index | Purpose |
|-----------|-------|---------|
| Complaints | `{ location: '2dsphere' }` | Geo queries for visit mode & clustering |
| Complaints | `{ status: 1, priority: 1, createdAt: -1 }` | Dashboard filtered views |
| Complaints | `{ assignedOfficer: 1, status: 1 }` | Officer workload queries |
| Complaints | `{ 'sla.breached': 1, status: 1 }` | SLA breach reports |
| ComplaintClusters | `{ location: '2dsphere' }` | Duplicate detection radius search |
| Users | `{ email: 1 }` | Login lookup |
| Users | `{ phone: 1 }` | OTP login lookup |

### Compound Indexes
- `Complaints: { assignedDepartment: 1, status: 1, createdAt: -1 }` — Department dashboard
- `Complaints: { 'address.district': 1, category: 1, status: 1 }` — Analytics queries
- `ComplaintHistory: { complaintId: 1, createdAt: -1 }` — Timeline views

---

## 4. Migration Strategy

1. **Version-controlled migrations** using `migrate-mongo`
2. Each migration file is timestamped and reversible
3. Seed data loaded via dedicated seed scripts
4. Zero-downtime migrations using MongoDB rolling strategy

## 5. Seed Strategy

Development seed data includes:
- 5 departments (MCD, PWD, DJB, DMRC, Delhi Police)
- 20 officers (4 per department)
- 100 sample complaints across all categories
- 10 complaint clusters
- 1 CM user, 1 Admin user, 10 citizen users
- Sample visit logs and metrics
