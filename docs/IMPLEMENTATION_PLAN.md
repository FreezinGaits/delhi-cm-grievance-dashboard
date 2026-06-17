# Implementation Plan

## Delhi CM Grievance Dashboard

**Version:** 1.0.0  
**Last Updated:** 2026-06-17  

---

## Implementation Order

Each phase builds upon the previous one. No phase should be started until its dependencies are complete.

### Dependency Graph

```
Phase 0 (Docs)
    └── Phase 1 (Setup)
        └── Phase 2 (Database)
            └── Phase 3 (Auth)
                ├── Phase 4 (Citizen Intake)
                │   └── Phase 5 (Auto-Routing)
                │       └── Phase 6 (Clustering)
                │           └── Phase 10 (Citizen Veto)
                ├── Phase 7 (Officer Dashboard)
                │   └── Phase 11 (Critical Alerts)
                └── Phase 8 (CM Dashboard)
                    └── Phase 9 (Field Visit Mode)
                        └── Phase 12 (Analytics)
                            └── Phase 13 (Integrations)
                                └── Phase 14 (Observability)
                                    └── Phase 15 (Testing)
                                        └── Phase 16 (Deployment)
                                            └── Final (Submission)
```

---

## Phase Details

### Phase 1: Repository Setup
**Files to Create:**
- `package.json` (root workspace)
- `frontend/` — Next.js 15 app with TypeScript + Tailwind + Shadcn
- `backend/` — Express + TypeScript app
- `docker-compose.yml` — All services
- `.env.example` — Environment template
- `.github/workflows/ci.yml` — CI pipeline
- `.husky/` — Git hooks
- `.prettierrc`, `.eslintrc.js`, `commitlint.config.js`

**Acceptance Criteria:**
- `docker compose up` starts all services
- Frontend accessible on `localhost:3000`
- Backend accessible on `localhost:5000`
- MongoDB, Redis, MinIO are running and connected

### Phase 2: Database Models
**Files to Create:**
- All Mongoose model files in `backend/src/models/`
- Database connection config
- Seed script with demo data
- Migration setup

**Acceptance Criteria:**
- All models compile without errors
- Indexes created successfully
- Seed data populates correctly
- Geospatial queries work

### Phase 3: Authentication
**Files to Create:**
- Auth routes, controller, service
- Auth middleware (JWT verification)
- RBAC middleware
- Rate limiting middleware
- OTP service

**Acceptance Criteria:**
- Register/login/logout work
- OTP login works
- JWT refresh works
- Role-based route protection works
- Brute force protection activates after 5 attempts

### Phase 4-16: (Detailed in respective phase prompts)

---

## Coding Standards

### TypeScript
- Strict mode enabled
- No `any` types (use `unknown` + type guards)
- Interfaces over types for object shapes
- Enums for fixed value sets

### API Design
- RESTful conventions
- Consistent error response format
- Pagination on all list endpoints
- Request validation on all write endpoints

### Git Conventions
- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- One commit per completed milestone
- Meaningful commit messages

### Testing
- Unit tests for services and utilities
- Integration tests for API endpoints
- E2E tests for critical user flows
- Target: 80%+ coverage

### Documentation
- JSDoc comments on all public functions
- README update per phase
- API docs kept in sync with implementation
