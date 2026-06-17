# System Architecture

## Delhi CM Grievance & Complaint Management Dashboard

**Version:** 1.0.0  
**Last Updated:** 2026-06-17  

---

## 1. Architecture Overview

The system follows a **microservices-ready monolith** architecture pattern — starting as a well-structured monolith that can be broken into microservices as scale demands. This is ideal for an MVP that needs to demonstrate production readiness.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENTS                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ Web App  │  │ WhatsApp │  │   SMS    │  │ Social Media     │   │
│  │ (Next.js)│  │   Bot    │  │ Gateway  │  │ Webhook          │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘   │
│       │              │              │                 │             │
└───────┼──────────────┼──────────────┼─────────────────┼─────────────┘
        │              │              │                 │
        ▼              ▼              ▼                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    API GATEWAY / LOAD BALANCER                       │
│                    (Nginx / Docker Reverse Proxy)                    │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     BACKEND APPLICATION LAYER                       │
│                     (Node.js + Express + TypeScript)                 │
│                                                                     │
│  ┌─────────────┐ ┌─────────────┐ ┌──────────────┐ ┌────────────┐  │
│  │   Auth      │ │  Complaint  │ │   Routing    │ │  Analytics │  │
│  │   Module    │ │  Module     │ │   Engine     │ │  Module    │  │
│  └─────────────┘ └─────────────┘ └──────────────┘ └────────────┘  │
│  ┌─────────────┐ ┌─────────────┐ ┌──────────────┐ ┌────────────┐  │
│  │  Clustering │ │ Notification│ │  Integration │ │   Alert    │  │
│  │  Module     │ │  Module     │ │  Module      │ │  Engine    │  │
│  └─────────────┘ └─────────────┘ └──────────────┘ └────────────┘  │
└──────────┬──────────────┬───────────────┬──────────────┬────────────┘
           │              │               │              │
           ▼              ▼               ▼              ▼
┌────────────────┐ ┌────────────┐ ┌─────────────┐ ┌──────────────┐
│   MongoDB      │ │   Redis    │ │   BullMQ    │ │   MinIO      │
│   (Primary DB) │ │   (Cache)  │ │   (Queue)   │ │   (Storage)  │
└────────────────┘ └────────────┘ └─────────────┘ └──────────────┘
```

---

## 2. Component Architecture

### 2.1 Frontend (Next.js 15 App Router)

```
frontend/
├── src/
│   ├── app/                    # App Router pages
│   │   ├── (auth)/             # Auth pages (login, register, OTP)
│   │   ├── (citizen)/          # Citizen portal
│   │   │   ├── complaints/     # Submit & track complaints
│   │   │   └── dashboard/      # Citizen dashboard
│   │   ├── (officer)/          # Officer workspace
│   │   │   ├── dashboard/      # Kanban board
│   │   │   └── complaints/     # Assigned complaints
│   │   ├── (admin)/            # Admin panel
│   │   │   ├── departments/    # Department management
│   │   │   ├── officers/       # Officer management
│   │   │   └── settings/       # System settings
│   │   ├── (cm)/               # CM Dashboard
│   │   │   ├── dashboard/      # Analytics overview
│   │   │   ├── heatmap/        # Complaint heatmap
│   │   │   ├── visit-mode/     # Field visit mode
│   │   │   └── alerts/         # Critical alerts
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Landing page
│   ├── components/             # Reusable UI components
│   │   ├── ui/                 # Shadcn UI components
│   │   ├── maps/               # Map components (Leaflet)
│   │   ├── charts/             # Chart components (Recharts)
│   │   ├── forms/              # Form components
│   │   └── layout/             # Layout components
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Utility libraries
│   ├── services/               # API service layer
│   ├── store/                  # State management
│   ├── types/                  # TypeScript type definitions
│   └── styles/                 # Global styles
├── public/                     # Static assets
├── next.config.ts              # Next.js configuration
├── tailwind.config.ts          # Tailwind configuration
└── tsconfig.json               # TypeScript configuration
```

### 2.2 Backend (Express + TypeScript)

```
backend/
├── src/
│   ├── config/                 # App configuration
│   │   ├── database.ts         # MongoDB connection
│   │   ├── redis.ts            # Redis connection
│   │   ├── minio.ts            # MinIO connection
│   │   ├── queue.ts            # BullMQ setup
│   │   └── env.ts              # Environment variables
│   ├── models/                 # Mongoose models
│   │   ├── User.ts
│   │   ├── Department.ts
│   │   ├── Complaint.ts
│   │   ├── ComplaintHistory.ts
│   │   ├── ComplaintCluster.ts
│   │   ├── VisitLog.ts
│   │   ├── AuditLog.ts
│   │   ├── Notification.ts
│   │   ├── Assignment.ts
│   │   ├── OfficerMetrics.ts
│   │   └── DepartmentMetrics.ts
│   ├── routes/                 # API route definitions
│   │   ├── auth.routes.ts
│   │   ├── complaint.routes.ts
│   │   ├── department.routes.ts
│   │   ├── officer.routes.ts
│   │   ├── analytics.routes.ts
│   │   ├── admin.routes.ts
│   │   └── cm.routes.ts
│   ├── controllers/            # Route handlers
│   ├── services/               # Business logic
│   │   ├── auth.service.ts
│   │   ├── complaint.service.ts
│   │   ├── routing.service.ts
│   │   ├── clustering.service.ts
│   │   ├── notification.service.ts
│   │   ├── analytics.service.ts
│   │   ├── alert.service.ts
│   │   └── integration.service.ts
│   ├── middleware/             # Express middleware
│   │   ├── auth.middleware.ts
│   │   ├── rbac.middleware.ts
│   │   ├── rateLimit.middleware.ts
│   │   ├── validation.middleware.ts
│   │   ├── audit.middleware.ts
│   │   └── error.middleware.ts
│   ├── workers/                # BullMQ workers
│   │   ├── notification.worker.ts
│   │   ├── clustering.worker.ts
│   │   ├── classification.worker.ts
│   │   ├── report.worker.ts
│   │   └── sync.worker.ts
│   ├── utils/                  # Utility functions
│   ├── types/                  # TypeScript types
│   └── app.ts                  # Express app setup
├── tests/                      # Test files
├── tsconfig.json
└── package.json
```

---

## 3. Data Flow Architecture

### 3.1 Complaint Submission Flow

```
Citizen submits complaint
        │
        ▼
   [Validation Layer]
   - Input sanitization
   - File type/size check
   - Rate limiting check
        │
        ▼
   [Auth Middleware]
   - Verify JWT/OTP
        │
        ▼
   [Complaint Controller]
   - Generate reference number (DEL-YYYYMMDD-XXXXX)
   - Store complaint in MongoDB
   - Upload media to MinIO
        │
        ├─── [BullMQ: Notification Queue]
        │    └── Send confirmation SMS/WhatsApp/Email
        │
        ├─── [BullMQ: Classification Queue]
        │    └── Auto-classify complaint category
        │
        ├─── [BullMQ: Clustering Queue]
        │    └── Check for duplicate complaints nearby
        │
        └─── [BullMQ: Routing Queue]
             └── Assign to department → officer
```

### 3.2 Resolution Verification Flow

```
Officer marks "Resolved"
        │
        ▼
   [EXIF Metadata Check]
   - GPS within 50m of complaint?
   - Timestamp is recent?
   - Not a gallery/old photo?
        │
   ┌────┴────┐
   │  PASS   │  FAIL → Reject + Flag "Compliance Violation"
   └────┬────┘
        ▼
   Set status: "Provisionally Resolved"
        │
        ▼
   [Notification Queue]
   - Send citizen WhatsApp with proof photo
   - Include [Yes, Satisfied] / [No, Reject] buttons
        │
   ┌────┴────┐
   │ Citizen  │
   │ Response │
   └────┬────┘
        │
   ┌────┴────────────────┐
   │                      │
   ▼                      ▼
"Yes, Satisfied"     "No, Reject"
   │                      │
   ▼                      ▼
Status: CLOSED       Auto-Reopen +
                     Escalate to next
                     authority level
```

### 3.3 CM Field Visit Mode Flow

```
CM opens Field Visit Mode
        │
        ▼
   [Browser Geolocation API]
   - Get current GPS coordinates
        │
        ▼
   [API: GET /api/cm/nearby-complaints]
   - Query: lat, lng, radius (500m/1km/2km)
        │
        ▼
   [MongoDB Geospatial Query]
   - $geoNear with maxDistance
   - Filter: status IN (open, in_progress, critical)
        │
        ▼
   [Return complaints on map]
   - Pin markers with severity colors
   - Cluster indicators for duplicate groups
   - Critical alerts pulsing overlay
        │
        ▼
   [CM can tap any complaint]
   - View details
   - Issue spot directive
   - Trigger immediate escalation
```

---

## 4. Security Architecture

### 4.1 Authentication Flow

```
                    ┌─────────────┐
                    │   Client    │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Login API  │
                    │  /auth/login│
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Validate   │
                    │  Credentials│
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
         ┌────▼────┐  ┌───▼────┐  ┌───▼────┐
         │  JWT    │  │Refresh │  │ Audit  │
         │ Access  │  │ Token  │  │  Log   │
         │ Token   │  │(HTTP   │  │ Entry  │
         │(15min)  │  │Only    │  │        │
         │         │  │Cookie) │  │        │
         └─────────┘  └────────┘  └────────┘
```

### 4.2 RBAC Matrix

| Permission | Citizen | Officer | Dept Head | Admin | CM |
|------------|---------|---------|-----------|-------|----|
| Submit complaint | ✅ | ❌ | ❌ | ❌ | ❌ |
| View own complaints | ✅ | ❌ | ❌ | ❌ | ❌ |
| Confirm/reject resolution | ✅ | ❌ | ❌ | ❌ | ❌ |
| View assigned complaints | ❌ | ✅ | ✅ | ✅ | ✅ |
| Update complaint status | ❌ | ✅ | ✅ | ✅ | ❌ |
| Upload evidence | ❌ | ✅ | ✅ | ❌ | ❌ |
| Reassign complaints | ❌ | ❌ | ✅ | ✅ | ✅ |
| View analytics | ❌ | ❌ | ✅ | ✅ | ✅ |
| View heatmap | ❌ | ❌ | ❌ | ✅ | ✅ |
| Field Visit Mode | ❌ | ❌ | ❌ | ❌ | ✅ |
| Issue spot directive | ❌ | ❌ | ❌ | ❌ | ✅ |
| Manage departments | ❌ | ❌ | ❌ | ✅ | ❌ |
| Manage users | ❌ | ❌ | ❌ | ✅ | ❌ |
| View audit logs | ❌ | ❌ | ❌ | ✅ | ✅ |
| Configure routing rules | ❌ | ❌ | ❌ | ✅ | ❌ |

---

## 5. Infrastructure Architecture

### 5.1 Docker Compose Services

```yaml
Services:
  frontend:     Next.js 15 App        → Port 3000
  backend:      Express API Server     → Port 5000
  mongodb:      MongoDB 7              → Port 27017
  redis:        Redis 7                → Port 6379
  minio:        MinIO Object Storage   → Port 9000/9001
  prometheus:   Metrics Collection     → Port 9090
  grafana:      Monitoring Dashboards  → Port 3001
```

### 5.2 Deployment Architecture (Production)

```
┌─────────────────────────────────────────────────┐
│                   AWS / Cloud                    │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │           Application Load Balancer       │   │
│  └──────────────────┬───────────────────────┘   │
│                     │                            │
│    ┌────────────────┼────────────────┐           │
│    │                │                │           │
│  ┌─▼──┐         ┌──▼──┐         ┌──▼──┐        │
│  │EC2 │         │EC2  │         │EC2  │        │
│  │App1│         │App2 │         │App3 │        │
│  └────┘         └─────┘         └─────┘        │
│                     │                            │
│  ┌──────────────────┼───────────────────────┐   │
│  │      Data Layer (Private Subnet)          │   │
│  │  ┌─────────┐ ┌──────┐ ┌──────┐ ┌─────┐  │   │
│  │  │MongoDB  │ │Redis │ │MinIO │ │SQS/ │  │   │
│  │  │Atlas    │ │Elast.│ │  S3  │ │Bull │  │   │
│  │  └─────────┘ └──────┘ └──────┘ └─────┘  │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

---

## 6. Technology Justification

### Why Next.js 15 (App Router)?
- Server-side rendering for fast dashboard load times
- Route-based code organization
- React Server Components for data-heavy pages
- Better mobile performance
- Built-in API routes as fallback

### Why MongoDB?
- Complaint records are naturally heterogeneous (water complaint vs road complaint vs law-and-order)
- Schema flexibility for evolving complaint categories
- Built-in geospatial queries for clustering and field visit mode
- History arrays and nested attachments

### Why Redis?
- Dashboard caching (open complaints, SLA breaches, heatmap data)
- Session support
- Rate limiting
- Duplicate search acceleration
- BullMQ job coordination

### Why BullMQ?
- Government workflows are inherently async (SMS, reports, classification, API sync)
- Moves heavy work out of request path
- Built-in retry, delay, and priority support
- Redis-backed for reliability

### Why MinIO/S3?
- Evidence photos and videos must not live in MongoDB
- Better performance, lower DB bloat
- Easy access control and retention policies

### Why Leaflet?
- Open-source (no API key costs for MVP)
- Excellent geospatial rendering
- Heatmap plugins available
- Lightweight and mobile-friendly
