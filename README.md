# 🏛️ Delhi CM Grievance & Complaint Management Dashboard

> AI-powered Governance Intelligence Platform for the Chief Minister's Office

[![CI Pipeline](https://github.com/FreezinGaits/delhi-cm-grievance-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/FreezinGaits/delhi-cm-grievance-dashboard/actions)

## 🎯 Overview

A production-grade, full-stack grievance management system designed for the Delhi Chief Minister's Office. The platform enables end-to-end complaint lifecycle management — from citizen intake to AI-powered routing, officer Kanban workflows, citizen verification (veto), and CM-level analytics with field visit mode.

### Primary Differentiators

| Feature | Description |
|---------|------------|
| 🛡️ **Field Visit Mode** | GPS-powered nearby complaint view for on-ground inspections |
| ✅ **Citizen Veto** | No complaint closes until citizen confirms resolution |
| 🔗 **Duplicate Clustering** | Geo-radius intelligent merging into master tickets |
| 🚨 **Critical Alert Engine** | Life-threatening complaints bypass queues with 4-hour SLA |
| 📊 **Officer Resource Ledger** | Real-time workload monitoring and intelligent re-routing |
| 🔒 **Anti-Fraud by Design** | EXIF geotagging validation and complete audit trail |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 15)                     │
│  Landing │ Login │ CM Dashboard │ Officer Kanban │ Citizen   │
├─────────────────────────────────────────────────────────────┤
│                    BACKEND (Express + TS)                    │
│  Auth │ Complaints │ Routing │ Analytics │ Notifications    │
├──────────────┬──────────────┬──────────────┬────────────────┤
│   MongoDB 7  │   Redis 7    │    MinIO     │    BullMQ      │
│  (Database)  │   (Cache)    │  (Storage)   │   (Queues)     │
└──────────────┴──────────────┴──────────────┴────────────────┘
```

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS |
| **Backend** | Express.js, TypeScript, Mongoose ODM |
| **Database** | MongoDB 7 with geospatial indexes |
| **Cache** | Redis 7 (session, rate limiting) |
| **Queue** | BullMQ (async job processing) |
| **Storage** | MinIO (S3-compatible file storage) |
| **Auth** | JWT (access + refresh), OTP, bcrypt |
| **DevOps** | Docker Compose, GitHub Actions CI |
| **Code Quality** | ESLint, Prettier, Husky, Commitlint |

## 📁 Project Structure

```
delhi-cm-grievance-dashboard/
├── backend/                    # Express API server
│   ├── src/
│   │   ├── config/            # Database, Redis, MinIO, env
│   │   ├── controllers/       # Request handlers
│   │   ├── middleware/        # Auth, RBAC, rate limiting, errors
│   │   ├── models/            # Mongoose schemas (11 models)
│   │   ├── routes/            # API route definitions
│   │   ├── services/          # Business logic layer
│   │   ├── scripts/           # Seed & migration scripts
│   │   └── utils/             # Logger, helpers
│   └── Dockerfile
├── frontend/                   # Next.js application
│   ├── src/app/
│   │   ├── dashboard/
│   │   │   ├── cm/            # CM analytics & command center
│   │   │   ├── officer/       # Kanban board & evidence upload
│   │   │   ├── citizen/       # Complaint submission & tracking
│   │   │   └── admin/         # User & department management
│   │   ├── login/             # Multi-mode authentication
│   │   └── track/             # Public complaint tracker
│   └── Dockerfile
├── docs/                       # Architecture documentation
├── scripts/                    # MongoDB init scripts
├── docker-compose.yml          # Full-stack orchestration
└── .github/workflows/          # CI pipeline
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

### CM Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/cm/dashboard` | Full analytics summary |
| GET | `/api/v1/cm/heatmap` | Geospatial complaint data |
| GET | `/api/v1/cm/nearby-complaints` | Field visit mode |
| GET | `/api/v1/cm/officer-ledger` | Officer workload data |
| POST | `/api/v1/cm/spot-directive` | Issue spot directive |

### Officer Workflow
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/officers/dashboard` | Kanban board data |
| PATCH | `/api/v1/officers/complaints/:id/accept` | Accept assignment |
| POST | `/api/v1/officers/complaints/:id/evidence` | Upload proof |

## 🗃️ Database Models

11 Mongoose models with comprehensive indexing:

- **User** — Multi-role (Citizen, Officer, Dept Head, Admin, CM) with OTP & brute force protection
- **Department** — Routing rules, SLA defaults, jurisdiction mapping
- **Complaint** — Core entity with geospatial, SLA, clustering, evidence, citizen veto
- **ComplaintHistory** — Full audit trail for every status change
- **ComplaintCluster** — Duplicate detection and master ticket merging
- **Assignment** — Officer-complaint assignment tracking
- **Notification** — Multi-channel (SMS, Email, WhatsApp, Push)
- **AuditLog** — System-wide action logging
- **OfficerMetrics** — Performance and workload tracking
- **DepartmentMetrics** — Department-level analytics
- **VisitLog** — CM field visit sessions

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

## 📊 Complaint Lifecycle

```
Submitted → Under Review → Assigned → In Progress
    → Provisionally Resolved → [Citizen Confirms] → Resolved → Closed
    → Provisionally Resolved → [Citizen Rejects] → Escalated → Re-assigned
```

## 📄 License

This project is built as a demonstration of governance technology capabilities.

---

Built with ❤️ for better governance
