# Product Requirements Document (PRD)

## Delhi CM Grievance & Complaint Management Dashboard

**Version:** 1.0.0  
**Last Updated:** 2026-06-17  
**Status:** Active Development  

---

## 1. Executive Summary

The Delhi CM Grievance Dashboard is a production-grade governance intelligence platform designed for the Chief Minister's Office of Delhi. It transforms civic grievance management from a fragmented, manual process into a real-time operational command center with full accountability, transparency, and citizen empowerment.

**This is NOT a complaint registration portal.** This is:
- A **Governance Command Center**
- A **Civic Accountability Platform**
- A **Public Grievance Intelligence System**
- A **CM Field-Monitoring Dashboard**

---

## 2. Problem Statement

### 2.1 Core Issues
Delhi's grievance ecosystem has structural problems, not just software problems:

1. **Fragmented intake** — Citizens don't know where to file issues
2. **Lost complaints** — Complaints are delayed, reassigned, or lost between departments
3. **False closures** — Officers can falsely mark issues as resolved from their desks
4. **Zero visibility** — CM and senior leadership lack real-time ground reality data
5. **Department silos** — Systems fragmented across departments and channels
6. **Manual coordination** — Creates corruption risk and weak accountability
7. **API fragility** — Department APIs may be incomplete, inconsistent, or unavailable
8. **Poor UX** — Most portals aren't designed for non-technical staff or citizens

### 2.2 What the CM Actually Needs
- A **live operational map** of the city
- Ability to **inspect local hotspots instantly**
- An **accountability chain** for each grievance
- **Proof** that resolution actually happened
- **Department-level performance** views
- Ability to **intervene directly** in urgent cases

---

## 3. Product Principles

| Principle | Description |
|-----------|-------------|
| **Zero-friction citizen filing** | WhatsApp bot, mobile web portal, helpline-assisted logging |
| **Mobile-first CM experience** | Dashboard must be highly usable on phone during site visits |
| **Fallback-first government operations** | System must not fail if department APIs are unavailable |
| **Anti-fraud by design** | False closures, fake updates, and manipulation must be hard |
| **Auditability everywhere** | Every action logged, attributable, and searchable |
| **Extensible architecture** | New complaint types, departments, officers configurable, not hardcoded |

---

## 4. User Roles & Permissions

### 4.1 Citizen
- Submit complaints (text, photo, video, audio, location)
- Track complaint status
- Confirm or reject resolution (Citizen Veto)
- Receive notifications (WhatsApp, SMS, Email)

### 4.2 CM / CM Office
- View live city-wide analytics dashboard
- Field Visit Mode — nearby complaints on map
- Prioritize critical cases
- Drill down by district, department, severity
- Issue spot directives

### 4.3 Department Head / Nodal Officer
- View all department complaints
- Reassign cases between officers
- Monitor officer workload
- Escalate unresolved tickets
- Review SLA breaches

### 4.4 Field Officer / Employee
- View assigned complaints
- Accept ownership
- Add updates and evidence (geotagged photos)
- Request escalation or reclassification

### 4.5 Super Admin
- Manage departments, officers, categories
- Configure routing rules and SLA thresholds
- Review audit logs
- Manage access control

### 4.6 System Service Roles
- Notification workers
- Duplicate clustering workers
- AI classification workers
- Report generation workers
- External API sync workers

---

## 5. Primary Differentiators

### 5.1 Field Visit Mode
When the CM is physically in an area, the system shows nearby unresolved and critical complaints within a geofenced radius (500m / 1km / 2km).

### 5.2 Citizen Veto on Closure
A complaint is NEVER truly closed until the citizen confirms resolution. "Provisionally Resolved" → Citizen confirms → "Closed" OR Citizen rejects → Auto-reopen + Escalation.

### 5.3 Duplicate Complaint Clustering
Multiple complaints about the same issue at the same location are merged into a single master ticket. All subscribers get updates when the master is resolved.

### 5.4 Accountability Graph
Every complaint is mapped to: department → officer → status history → evidence trail → audit log.

### 5.5 Fallback-First Government Design
If department APIs fail, the system works through an internal employee dashboard. No single point of failure.

### 5.6 Auto-Segregation Engine
Complaint text, voice, image metadata, and location are used to auto-route grievances to the correct department and ward.

### 5.7 Critical Alert Engine
Life-threatening complaints (open manhole, live wire, gas leak, structural collapse) bypass normal workflow with immediate escalation and 4-hour SLA.

### 5.8 Officer Resource Ledger
CM sees officer load, bandwidth, open cases, and overload conditions with one-click re-routing.

### 5.9 Anti-False Closure System
- Officers must upload geotagged live photos to close tickets
- EXIF metadata validation (GPS within 50m of complaint, timestamp check)
- Gallery photos and old photos are rejected

---

## 6. Functional Requirements

### 6.1 Citizen Intake Module
- **FR-001:** Multi-channel complaint submission (Web, WhatsApp, Helpline)
- **FR-002:** OTP-based citizen authentication (no accounts required)
- **FR-003:** Media attachment support (images, video, audio)
- **FR-004:** Auto-location capture via GPS
- **FR-005:** Category selection with smart suggestions
- **FR-006:** Unique reference number generation (format: `DEL-YYYYMMDD-XXXXX`)
- **FR-007:** Real-time complaint status tracking

### 6.2 Complaint Processing
- **FR-008:** Auto-classification using keyword matching
- **FR-009:** Auto-routing to department based on category + location
- **FR-010:** Duplicate detection via geo-radius + text similarity
- **FR-011:** Master ticket creation for clustered complaints
- **FR-012:** Workload-balanced officer assignment
- **FR-013:** SLA tracking per complaint category

### 6.3 Officer Workflow
- **FR-014:** Kanban board view (New → Assigned → In Progress → Resolved → Rejected)
- **FR-015:** Evidence upload with geotagging enforcement
- **FR-016:** Status update with mandatory notes
- **FR-017:** Escalation request workflow
- **FR-018:** Department transfer capability

### 6.4 CM Dashboard
- **FR-019:** Summary cards (total, open, resolved, critical, SLA breaches)
- **FR-020:** Complaint heatmap overlay on Delhi map
- **FR-021:** Department performance comparison charts
- **FR-022:** Officer resource ledger with load indicators
- **FR-023:** Critical alert panel with immediate escalation
- **FR-024:** Field Visit Mode with GPS-based nearby complaints
- **FR-025:** Spot directive issuance

### 6.5 Resolution & Verification
- **FR-026:** Provisionally Resolved state machine
- **FR-027:** Citizen notification for confirmation
- **FR-028:** One-tap confirm/reject via WhatsApp/Web
- **FR-029:** Auto-reopen on citizen rejection
- **FR-030:** Escalation on repeated rejections

### 6.6 Analytics & Reporting
- **FR-031:** SLA compliance reports
- **FR-032:** Resolution rate trends
- **FR-033:** Department and officer performance dashboards
- **FR-034:** Geographic hotspot analysis
- **FR-035:** Exportable reports (PDF, CSV)

### 6.7 Integration
- **FR-036:** WhatsApp Business API integration
- **FR-037:** SMS gateway integration
- **FR-038:** Email notification integration
- **FR-039:** MCD311 API sync (mock for MVP)
- **FR-040:** Open311 standard compatibility

---

## 7. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| **Response Time** | < 200ms for dashboard API calls |
| **Uptime** | 99.9% availability target |
| **Concurrent Users** | Support 10,000+ simultaneous users |
| **Data Retention** | 7 years for complaint records |
| **Security** | OWASP Top 10 compliance |
| **Accessibility** | WCAG 2.1 AA compliance |
| **Mobile Support** | Responsive down to 320px width |
| **Browser Support** | Chrome, Firefox, Safari, Edge (latest 2 versions) |
| **Language Support** | English and Hindi |
| **Test Coverage** | 80%+ code coverage |

---

## 8. Success Metrics

| Metric | Target |
|--------|--------|
| Complaint submission time | < 2 minutes |
| Auto-routing accuracy | > 85% |
| False closure prevention rate | > 95% |
| Average resolution time improvement | 40% reduction |
| Citizen satisfaction on closure | > 70% confirmation rate |
| Dashboard load time | < 3 seconds |
| System uptime | > 99.9% |

---

## 9. Out of Scope (MVP)

- Voice-based complaint filing via IVR
- AI-powered image analysis for damage assessment
- Multi-language support beyond English/Hindi
- Public-facing analytics portal
- Integration with actual government department APIs (mocked for MVP)
- Payment/fee collection
- Social media ingestion (Twitter/X) — future phase
