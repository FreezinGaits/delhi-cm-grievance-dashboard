# 🏛️ Delhi Governance Intelligence Platform

> CM Command Center — Real-time Civic Operations Intelligence

[![CI Pipeline](https://github.com/FreezinGaits/delhi-cm-grievance-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/FreezinGaits/delhi-cm-grievance-dashboard/actions)

## 🎯 Overview

A production-grade, full-stack governance intelligence platform designed for the Delhi Chief Minister's Office. The platform enables end-to-end complaint lifecycle management — from multi-channel citizen intake (Web + WhatsApp) to AI-powered routing, DBSCAN incident clustering, officer accountability scoring, CM spot directives, and geospatial analytics with field visit mode.

### Primary Differentiators

| Feature | Description |
|---------|------------|
| 📱 **WhatsApp-First Intake** | Citizens file grievances entirely via WhatsApp — no website needed |
| 🔗 **Master Incident Clustering** | DBSCAN spatial clustering merges duplicate reports into master incidents |
| 🏅 **Accountability Scores** | Weighted 0-100 officer performance scores with rankings |
| 📋 **CM Spot Directives** | Issue directives during field visits with deadline tracking |
| 🛡️ **Field Visit Mode** | GPS-powered nearby complaint view for on-ground inspections |
| ✅ **Citizen Veto** | No complaint closes until citizen confirms resolution |
| 🚨 **Critical Alert Engine** | Life-threatening complaints bypass queues with 4-hour SLA |
| 📊 **Officer Resource Ledger** | Real-time workload monitoring and intelligent re-routing |
| 🔒 **Anti-Fraud by Design** | EXIF geotagging validation and complete audit trail |

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     INTAKE SOURCES                                │
│  🌐 Website   📱 WhatsApp   📞 IVR (future)   📢 Social (future) │
├──────────────────────────────────────────────────────────────────┤
│                    FRONTEND (Next.js 15)                          │
│  Landing │ Login │ CM Command Center │ Officer Kanban │ Citizen   │
├──────────────────────────────────────────────────────────────────┤
│                    BACKEND (Express + TS)                         │
│  Auth │ Complaints │ WhatsApp │ Directives │ Governance │ Workers│
├──────────────┬──────────────┬──────────────┬─────────────────────┤
│   MongoDB 7  │   Redis 7    │    MinIO     │       BullMQ        │
│  (Database)  │   (Cache)    │  (Storage)   │  (Queues/Workers)   │
└──────────────┴──────────────┴──────────────┴─────────────────────┘
```

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS, ShadCN |
| **Backend** | Express.js, TypeScript, Mongoose ODM |
| **Database** | MongoDB 7 with geospatial indexes |
| **Cache** | Redis 7 (session state, rate limiting) |
| **Queue** | BullMQ (6 worker queues) |
| **Storage** | MinIO (S3-compatible file storage) |
| **Auth** | JWT (access + refresh), OTP, bcrypt |
| **WhatsApp** | Meta WhatsApp Cloud API (mock mode supported) |
| **DevOps** | Docker Compose, GitHub Actions CI |
| **Code Quality** | ESLint, Prettier, Husky, Commitlint |

## 📁 Project Structure

```
delhi-cm-grievance-dashboard/
├── backend/                        # Express API server
│   ├── src/
│   │   ├── config/                # Database, Redis, MinIO, env
│   │   ├── controllers/          # Request handlers
│   │   ├── middleware/           # Auth, RBAC, rate limiting, errors
│   │   ├── models/               # Mongoose schemas (15 models)
│   │   │   ├── Complaint.ts      # Core complaint with clustering/directives
│   │   │   ├── WhatsAppSession.ts # WhatsApp conversation state
│   │   │   ├── WhatsAppMessage.ts # Full message audit trail
│   │   │   ├── Directive.ts      # CM spot directives
│   │   │   ├── OfficerScore.ts   # Accountability engine scores
│   │   │   └── ...
│   │   ├── routes/               # API route definitions
│   │   │   ├── whatsapp.routes.ts # Webhook + test endpoints
│   │   │   ├── directive.routes.ts # CM directive lifecycle
│   │   │   ├── governance.routes.ts # Clustering + accountability
│   │   │   └── ...
│   │   ├── services/             # Business logic layer
│   │   │   ├── whatsapp.service.ts     # Conversation state engine
│   │   │   ├── whatsapp.provider.ts    # Cloud API / mock provider
│   │   │   ├── clustering.service.ts   # DBSCAN spatial clustering
│   │   │   ├── accountability.service.ts # Officer scoring engine
│   │   │   ├── directive.service.ts    # CM directive lifecycle
│   │   │   └── ...
│   │   ├── workers/              # BullMQ queue workers
│   │   ├── scripts/              # Seed & migration scripts
│   │   └── utils/                # Logger, helpers
│   └── Dockerfile
├── frontend/                      # Next.js application
│   ├── src/app/
│   │   ├── dashboard/
│   │   │   ├── cm/               # CM analytics & command center
│   │   │   ├── officer/          # Kanban board & evidence upload
│   │   │   ├── citizen/          # Complaint submission & tracking
│   │   │   └── admin/            # User & department management
│   │   ├── login/                # Multi-mode authentication
│   │   └── track/                # Public complaint tracker
│   └── Dockerfile
├── docs/                          # Architecture documentation
│   ├── WHATSAPP_ARCHITECTURE.md
│   ├── WHATSAPP_API.md
│   ├── WHATSAPP_SEQUENCE_DIAGRAM.md
│   ├── WHATSAPP_DEPLOYMENT.md
│   ├── CLUSTERING_ARCHITECTURE.md
│   ├── ACCOUNTABILITY_ENGINE.md
│   ├── DIRECTIVES_ARCHITECTURE.md
│   ├── GOVERNANCE_ARCHITECTURE.md
│   └── ...
├── docker-compose.yml             # Full-stack orchestration
└── .github/workflows/             # CI pipeline
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose (for infrastructure)
- MongoDB 7 (local or Docker)

### Development Setup

```bash
# Clone
git clone https://github.com/FreezinGaits/delhi-cm-grievance-dashboard.git
cd delhi-cm-grievance-dashboard

# Copy environment config
cp .env.example .env

# Install dependencies
npm install --ignore-scripts
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Start infrastructure (MongoDB, Redis, MinIO)
docker compose up -d mongodb redis minio

# Seed the database
cd backend && npx tsx src/scripts/seed.ts && cd ..

# Start development servers
npm run dev:backend   # → http://localhost:5000
npm run dev:frontend  # → http://localhost:3000
```

### Docker (Full Stack)

```bash
docker compose up --build
```

## 🔐 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| **CM** | cm@delhi.gov.in | Password123! |
| **Admin** | admin@delhi.gov.in | Password123! |
| **Officer** | rajesh.verma@delhi.gov.in | Password123! |
| **Citizen** | rohit.kumar@gmail.com | Password123! |

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register citizen |
| POST | `/api/v1/auth/login` | Email/phone login |
| POST | `/api/v1/auth/login/otp/request` | Request OTP |
| POST | `/api/v1/auth/login/otp/verify` | Verify OTP |
| POST | `/api/v1/auth/refresh` | Refresh token |
| GET | `/api/v1/auth/me` | Current user profile |

### Complaints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/complaints` | Submit complaint |
| GET | `/api/v1/complaints` | List (with filters) |
| GET | `/api/v1/complaints/:id` | Get details |
| GET | `/api/v1/complaints/track/:ref` | Public tracking |
| PATCH | `/api/v1/complaints/:id/status` | Update status |
| POST | `/api/v1/complaints/:id/confirm` | Citizen confirms |
| POST | `/api/v1/complaints/:id/reject` | Citizen rejects |

### WhatsApp Intake (Phase A)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/webhooks/whatsapp` | Meta verification handshake |
| POST | `/webhooks/whatsapp` | Incoming message webhook |
| POST | `/webhooks/whatsapp/test` | Dev: Simulate WhatsApp message |
| GET | `/webhooks/whatsapp/sessions` | View active sessions |
| GET | `/webhooks/whatsapp/messages/:phone` | Message audit trail |

### CM Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/cm/dashboard` | Full analytics summary |
| GET | `/api/v1/cm/heatmap` | Geospatial complaint data |
| GET | `/api/v1/cm/nearby-complaints` | Field visit mode |
| GET | `/api/v1/cm/officer-ledger` | Officer workload data |
| GET | `/api/v1/cm/alerts` | Critical alerts |

### CM Directives (Phase D)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/directives` | Issue spot directive |
| GET | `/api/v1/directives` | List all directives |
| GET | `/api/v1/directives/stats` | Dashboard stats |
| GET | `/api/v1/directives/mine` | Officer's assigned directives |
| PATCH | `/api/v1/directives/:id/acknowledge` | Acknowledge directive |
| PATCH | `/api/v1/directives/:id/start` | Start work |
| PATCH | `/api/v1/directives/:id/complete` | Complete with evidence |

### Governance Intelligence (Phase B + C)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/governance/officer-rankings` | Performance rankings |
| GET | `/api/v1/governance/officer-score/:id` | Officer score history |
| POST | `/api/v1/governance/compute-scores` | Trigger score computation |
| GET | `/api/v1/governance/clusters` | Active incident clusters |
| GET | `/api/v1/governance/clusters/:id` | Cluster details |
| POST | `/api/v1/governance/run-clustering` | Trigger DBSCAN clustering |

### Officer Workflow
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/officers/dashboard` | Kanban board data |
| PATCH | `/api/v1/officers/complaints/:id/accept` | Accept assignment |
| POST | `/api/v1/officers/complaints/:id/evidence` | Upload proof |

## 🗃️ Database Models

15 Mongoose models with comprehensive indexing:

- **User** — Multi-role (Citizen, Officer, Dept Head, Admin, CM) with OTP & brute force protection
- **Department** — Routing rules, SLA defaults, jurisdiction mapping
- **Complaint** — Core entity with geospatial, SLA, clustering, directives, evidence, citizen veto
- **ComplaintHistory** — Full audit trail for every status change
- **ComplaintCluster** — DBSCAN spatial clustering for duplicate detection
- **WhatsAppSession** — Conversation state for WhatsApp intake flow
- **WhatsAppMessage** — Full audit trail of all WhatsApp messages
- **Directive** — CM spot directives with lifecycle tracking
- **OfficerScore** — Weighted accountability scores (0-100) with rankings
- **Assignment** — Officer-complaint assignment tracking
- **Notification** — Multi-channel (SMS, Email, WhatsApp, Push)
- **AuditLog** — System-wide action logging
- **OfficerMetrics** — Performance and workload tracking
- **DepartmentMetrics** — Department-level analytics
- **VisitLog** — CM field visit sessions

## ⚡ BullMQ Worker Queues

| Queue | Schedule | Purpose |
|-------|----------|---------|
| `whatsapp-incoming` | Real-time | Process incoming WhatsApp messages |
| `whatsapp-media` | Real-time | Download media attachments |
| `whatsapp-notify` | Real-time | Send outbound status notifications |
| `clustering` | Every 15 min | DBSCAN spatial complaint clustering |
| `accountability` | Daily midnight | Compute officer performance scores |
| `directive-check` | Hourly | Mark overdue directives |

## 🔒 Security Features

- JWT access/refresh token rotation
- bcrypt password hashing (12 rounds)
- Rate limiting (general, auth, OTP, complaint submission)
- Role-Based Access Control (5 roles)
- Account lockout after 5 failed attempts
- OTP with attempt limiting and expiry
- Soft delete pattern (data preservation)
- Complete audit logging
- CORS, Helmet, Compression middleware
- WhatsApp webhook signature verification

## 📊 Complaint Lifecycle

```
Submitted → Under Review → Assigned → In Progress
    → Provisionally Resolved → [Citizen Confirms] → Resolved → Closed
    → Provisionally Resolved → [Citizen Rejects] → Escalated → Re-assigned
```

## 📱 WhatsApp Flow

```
Citizen sends "Hi" → Bot asks name → Bot asks location (GPS pin)
→ Bot asks category → Bot asks description → Bot asks for photo (optional)
→ Summary → Confirm → Complaint created (same schema as web)
→ Reference number sent back
```

## 🧩 Mock Mode

All external integrations operate in **mock mode** when credentials are absent:
- **WhatsApp**: Messages logged to console with `[WhatsApp Mock]` prefix
- **SMS**: OTP bypassed in development
- **Storage**: Falls back to local filesystem if MinIO unavailable

No real API keys are required for development.

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [WHATSAPP_ARCHITECTURE.md](docs/WHATSAPP_ARCHITECTURE.md) | WhatsApp intake system design |
| [WHATSAPP_API.md](docs/WHATSAPP_API.md) | Webhook API reference |
| [WHATSAPP_SEQUENCE_DIAGRAM.md](docs/WHATSAPP_SEQUENCE_DIAGRAM.md) | Interaction sequence diagrams |
| [WHATSAPP_DEPLOYMENT.md](docs/WHATSAPP_DEPLOYMENT.md) | WhatsApp deployment guide |
| [CLUSTERING_ARCHITECTURE.md](docs/CLUSTERING_ARCHITECTURE.md) | DBSCAN clustering design |
| [ACCOUNTABILITY_ENGINE.md](docs/ACCOUNTABILITY_ENGINE.md) | Officer scoring methodology |
| [DIRECTIVES_ARCHITECTURE.md](docs/DIRECTIVES_ARCHITECTURE.md) | CM directives lifecycle |
| [GOVERNANCE_ARCHITECTURE.md](docs/GOVERNANCE_ARCHITECTURE.md) | Unified platform vision |
| [SYSTEM_ARCHITECTURE.md](docs/SYSTEM_ARCHITECTURE.md) | Overall system architecture |
| [API_SPECIFICATION.md](docs/API_SPECIFICATION.md) | Full API spec |
| [DATABASE_DESIGN.md](docs/DATABASE_DESIGN.md) | Database schema design |
| [SECURITY_ARCHITECTURE.md](docs/SECURITY_ARCHITECTURE.md) | Security measures |

## 📄 License

This project is built as a demonstration of governance technology capabilities.

---

Built with ❤️ for better governance
