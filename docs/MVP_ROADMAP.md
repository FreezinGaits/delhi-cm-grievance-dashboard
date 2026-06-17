# MVP Roadmap

## Delhi CM Grievance Dashboard

**Version:** 1.0.0  
**Last Updated:** 2026-06-17  

---

## MVP Scope

The MVP demonstrates the full complaint lifecycle with all differentiating features. It is designed to be presentable to hackathon judges while being architecturally production-ready.

---

## Phase Timeline

| Phase | Name | Duration | Priority |
|-------|------|----------|----------|
| 0 | Architecture & Documentation | Day 1 | P0 |
| 1 | Project Setup & Infrastructure | Day 1 | P0 |
| 2 | Database Design & Models | Day 1-2 | P0 |
| 3 | Authentication System | Day 2 | P0 |
| 4 | Citizen Complaint Intake | Day 2-3 | P0 |
| 5 | Auto-Routing Engine | Day 3 | P0 |
| 6 | Duplicate Clustering | Day 3-4 | P1 |
| 7 | Officer Dashboard | Day 4 | P0 |
| 8 | CM Dashboard | Day 4-5 | P0 |
| 9 | Field Visit Mode | Day 5 | P0 |
| 10 | Citizen Veto System | Day 5-6 | P0 |
| 11 | Critical Alert Engine | Day 6 | P1 |
| 12 | Analytics Engine | Day 6-7 | P1 |
| 13 | Integration Layer | Day 7 | P2 |
| 14 | Observability | Day 7-8 | P2 |
| 15 | Testing & Hardening | Day 8 | P1 |
| 16 | Deployment | Day 8-9 | P1 |
| Final | Hackathon Submission | Day 9 | P0 |

---

## MVP Must-Have Features (P0)

1. ✅ Citizen complaint submission with media upload
2. ✅ OTP-based citizen authentication
3. ✅ Auto-routing to department and officer
4. ✅ Officer Kanban dashboard with status updates
5. ✅ CM dashboard with summary analytics
6. ✅ Field Visit Mode with GPS-based nearby complaints
7. ✅ Citizen Veto on closure
8. ✅ Complaint heatmap on Delhi map
9. ✅ Reference number tracking
10. ✅ Role-based access control

## MVP Should-Have Features (P1)

1. ⬜ Duplicate complaint clustering
2. ⬜ Critical alert engine
3. ⬜ Analytics with charts and trends
4. ⬜ SLA breach monitoring
5. ⬜ Officer resource ledger
6. ⬜ Comprehensive testing (80%+ coverage)
7. ⬜ Docker deployment

## MVP Nice-to-Have Features (P2)

1. ⬜ WhatsApp integration
2. ⬜ SMS/Email notifications
3. ⬜ MCD311/Open311 mock integration
4. ⬜ Prometheus + Grafana observability
5. ⬜ Social media intake

---

## Demo Script (for Judges)

### 1. Citizen Flow (2 min)
- Open citizen portal
- Login via OTP
- Submit complaint with photo + GPS location
- Receive reference number
- Track complaint status

### 2. Auto-Processing (1 min)
- Show auto-classification
- Show auto-routing to department
- Show officer assignment

### 3. Officer Flow (2 min)
- Login as officer
- View Kanban board
- Accept complaint
- Add update notes
- Upload resolution evidence (geotagged)
- Mark as resolved

### 4. Citizen Verification (1 min)
- Show citizen gets "Provisionally Resolved" notification
- Citizen confirms → Complaint closed
- (Alternate) Citizen rejects → Auto-escalation

### 5. CM Dashboard (3 min)
- Login as CM
- View summary cards
- View complaint heatmap
- Open Field Visit Mode
- Show nearby complaints
- Issue spot directive
- View officer resource ledger
- Check critical alerts
- View department performance charts

### 6. Anti-Fraud Demo (1 min)
- Attempt to close complaint without geotagged photo → Rejected
- Show complete audit trail
